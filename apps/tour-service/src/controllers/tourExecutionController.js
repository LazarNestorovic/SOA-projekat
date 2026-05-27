const { pool } = require('../config/database');

// Haversine formula za razdaljinu u metrima
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  var R = 6371e3; // Radius of the earth in m
  var dLat = deg2rad(lat2-lat1); 
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in m
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Opciono za mockovanje kupovine ture:
const purchaseTour = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    try {
        await pool.query('INSERT INTO tour_purchases (tour_id, tourist_id, price) VALUES ($1, $2, (SELECT price FROM tours WHERE id = $1)) ON CONFLICT DO NOTHING', [id, userId]);
        res.status(200).json({ message: 'Tura kupljena uspesno.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Greska pri kupovini.' });
    }
}

const startTour = async (req, res) => {
    const { id } = req.params; // tourId
    const userId = req.user.user_id;
    
    try {
        // Provera da li je tura objavljena ili arhivirana
        const tourResult = await pool.query('SELECT status FROM tours WHERE id = $1', [id]);
        if (tourResult.rows.length === 0) return res.status(404).json({ error: 'Tura nije pronadjena' });
        
        const status = tourResult.rows[0].status;
        // TODO (REVERT LATER): Privremeno zakomentarisana provera statusa kako bi mogle da se pokrenu sve ture
        /*
        if (status !== 'published' && status !== 'archived') {
            return res.status(400).json({ error: 'Tura mora biti objavljena ili arhivirana da bi se pokrenula' });
        }
        */
        
        // Provera da li je tura kupljena
        const purchaseResult = await pool.query('SELECT * FROM tour_purchases WHERE tour_id = $1 AND tourist_id = $2', [id, userId]);
        if (purchaseResult.rows.length === 0) {
            return res.status(403).json({ error: 'Morate kupiti turu pre pokretanja' });
        }

        // Proveri da li vec ima aktivnu
        const activeResult = await pool.query("SELECT * FROM tour_executions WHERE tour_id = $1 AND tourist_id = $2 AND status = 'active'", [id, userId]);
        if (activeResult.rows.length > 0) {
            return res.status(200).json(activeResult.rows[0]);
        }
        
        // Kreiraj novu sesiju
        const result = await pool.query(
            "INSERT INTO tour_executions (tour_id, tourist_id, status, completed_key_points) VALUES ($1, $2, 'active', '[]') RETURNING *",
            [id, userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Greska pri pokretanju ture:', error);
        res.status(500).json({ error: 'Serverska greska pri pokretanju ture' });
    }
};

const checkStatus = async (req, res) => {
    const { executionId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user.user_id;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude missing' });
    }

    try {
        // azuriraj poziciju
        await pool.query(
            `INSERT INTO tourist_current_positions (tourist_id, latitude, longitude, updated_at) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (tourist_id) 
             DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = CURRENT_TIMESTAMP`,
            [userId, latitude, longitude]
        );

        // dohvati execution
        const execRs = await pool.query("SELECT * FROM tour_executions WHERE id = $1 AND tourist_id = $2 AND status = 'active'", [executionId, userId]);
        if (execRs.rows.length === 0) {
            return res.status(404).json({ error: 'Aktivna sesija nije pronadjena' });
        }
        
        let exec = execRs.rows[0];
        let completedIds = exec.completed_key_points || [];

        // dohvati sve key_points za turu
        const kpRs = await pool.query("SELECT id, name, latitude, longitude FROM tour_key_points WHERE tour_id = $1", [exec.tour_id]);
        
        let newCompletions = false;
        
        kpRs.rows.forEach(kp => {
            // ako vec nije zavrsen
            if (!completedIds.some(c => c.id === kp.id)) {
                let dist = getDistanceFromLatLonInM(latitude, longitude, kp.latitude, kp.longitude);
                if (dist <= 100) { // 100m tolerance according to new requirements
                    completedIds.push({ id: kp.id, reached_at: new Date().toISOString() });
                    newCompletions = true;
                }
            }
        });

        const isTourFinished = completedIds.length === kpRs.rows.length && completedIds.length > 0;
        
        let newStatus = isTourFinished ? 'completed' : 'active';
        let endTimeQuery = isTourFinished ? ', end_time = CURRENT_TIMESTAMP' : '';

        // Azuriraj last_activity svakako, a completed_key_points i status ako ima promena
        await pool.query(
            `UPDATE tour_executions SET status = $1, last_activity = CURRENT_TIMESTAMP, completed_key_points = $2 ${endTimeQuery} WHERE id = $3`,
            [newStatus, JSON.stringify(completedIds), executionId]
        );

        res.status(200).json({ 
             message: 'Status checked', 
             completed_key_points: completedIds, 
             new_completions: newCompletions,
             is_finished: isTourFinished
        });
    } catch (error) {
        console.error('Greska pri proveri statusa:', error);
        res.status(500).json({ error: 'Serverska greška' });
    }
};

const completeTour = async (req, res) => {
    const { executionId } = req.params;
    const userId = req.user.user_id;

    try {
        const rs = await pool.query(
            "UPDATE tour_executions SET status = 'completed', end_time = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = $1 AND tourist_id = $2 AND status = 'active' RETURNING *",
            [executionId, userId]
        );
        res.status(200).json(rs.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Greška pri zavrsetku' });
    }
}

const abandonTour = async (req, res) => {
    const { executionId } = req.params;
    const userId = req.user.user_id;

    try {
        const rs = await pool.query(
            "UPDATE tour_executions SET status = 'abandoned', end_time = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = $1 AND tourist_id = $2 AND status = 'active' RETURNING *",
            [executionId, userId]
        );
        res.status(200).json(rs.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Greška pri napustanju' });
    }
}

module.exports = {
    purchaseTour,
    startTour,
    checkStatus,
    completeTour,
    abandonTour
};
