const { pool } = require('../config/database');

// Haversine formula za razdaljinu u metrima
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Mock kupovina (za testiranje bez korpe)
const purchaseTour = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;
  try {
    await pool.query(
      'INSERT INTO tour_purchases (tour_id, tourist_id, price) VALUES ($1, $2, (SELECT price FROM tours WHERE id = $1)) ON CONFLICT DO NOTHING',
      [id, userId]
    );
    res.status(200).json({ message: 'Tura kupljena uspesno.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greska pri kupovini.' });
  }
};

const startTour = async (req, res) => {
  const { id } = req.params; // tourId
  const userId = req.user.user_id;

  try {
    // Provera da li tura postoji i da li je objavljena ili arhivirana
    const tourResult = await pool.query(
      'SELECT status FROM tours WHERE id = $1',
      [id]
    );
    if (tourResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tura nije pronadjena' });
    }

    const { status } = tourResult.rows[0];
    if (status !== 'published' && status !== 'archived') {
      return res.status(400).json({ error: 'Tura mora biti objavljena ili arhivirana da bi se pokrenula' });
    }

    // Provera kupovine — koristi tour_purchase_tokens (realni sistem kupovine putem korpe)
    const purchaseResult = await pool.query(
      'SELECT id FROM tour_purchase_tokens WHERE tour_id = $1 AND tourist_id = $2',
      [id, userId]
    );
    if (purchaseResult.rows.length === 0) {
      return res.status(403).json({ error: 'Morate kupiti turu pre pokretanja' });
    }

    // Ako vec postoji aktivna sesija, vrati je
    const activeResult = await pool.query(
      "SELECT * FROM tour_executions WHERE tour_id = $1 AND tourist_id = $2 AND status = 'active'",
      [id, userId]
    );
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
    return res.status(400).json({ error: 'Latitude i longitude su obavezni' });
  }

  try {
    // Snimi trenutnu poziciju turiste (Position Simulator)
    await pool.query(
      `INSERT INTO tourist_current_positions (tourist_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (tourist_id)
       DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = CURRENT_TIMESTAMP`,
      [userId, latitude, longitude]
    );

    // Dohvati aktivnu sesiju
    const execRs = await pool.query(
      "SELECT * FROM tour_executions WHERE id = $1 AND tourist_id = $2 AND status = 'active'",
      [executionId, userId]
    );
    if (execRs.rows.length === 0) {
      return res.status(404).json({ error: 'Aktivna sesija nije pronadjena' });
    }

    const exec = execRs.rows[0];
    let completedIds = exec.completed_key_points || [];

    // Dohvati sve ključne tačke ture
    const kpRs = await pool.query(
      'SELECT id, name, latitude, longitude FROM tour_key_points WHERE tour_id = $1',
      [exec.tour_id]
    );

    let newCompletions = false;

    kpRs.rows.forEach((kp) => {
      // Ako tačka nije već dostignuta, proveri razdaljinu
      if (!completedIds.some((c) => c.id === kp.id)) {
        const dist = getDistanceFromLatLonInM(latitude, longitude, kp.latitude, kp.longitude);
        if (dist <= 100) { // 100m tolerancija
          completedIds.push({ id: kp.id, reached_at: new Date().toISOString() });
          newCompletions = true;
        }
      }
    });

    const isTourFinished =
      kpRs.rows.length > 0 && completedIds.length === kpRs.rows.length;

    const newStatus = isTourFinished ? 'completed' : 'active';
    const endTimeClause = isTourFinished ? ', end_time = CURRENT_TIMESTAMP' : '';

    // Uvek azuriraj last_activity; azuriraj status i completed_key_points ako ima promena
    await pool.query(
      `UPDATE tour_executions
       SET status = $1,
           last_activity = CURRENT_TIMESTAMP,
           completed_key_points = $2
           ${endTimeClause}
       WHERE id = $3`,
      [newStatus, JSON.stringify(completedIds), executionId]
    );

    res.status(200).json({
      message: 'Status proveren',
      completed_key_points: completedIds,
      new_completions: newCompletions,
      is_finished: isTourFinished,
    });
  } catch (error) {
    console.error('Greska pri proveri statusa:', error);
    res.status(500).json({ error: 'Serverska greška pri proveri statusa' });
  }
};

const completeTour = async (req, res) => {
  const { executionId } = req.params;
  const userId = req.user.user_id;

  try {
    const rs = await pool.query(
      `UPDATE tour_executions
       SET status = 'completed', end_time = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP
       WHERE id = $1 AND tourist_id = $2 AND status = 'active'
       RETURNING *`,
      [executionId, userId]
    );
    if (rs.rows.length === 0) {
      return res.status(404).json({ error: 'Aktivna sesija nije pronadjena' });
    }
    res.status(200).json(rs.rows[0]);
  } catch (error) {
    console.error('Greska pri zavrsetku ture:', error);
    res.status(500).json({ error: 'Greška pri zavrsetku ture' });
  }
};

const abandonTour = async (req, res) => {
  const { executionId } = req.params;
  const userId = req.user.user_id;

  try {
    const rs = await pool.query(
      `UPDATE tour_executions
       SET status = 'abandoned', end_time = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP
       WHERE id = $1 AND tourist_id = $2 AND status = 'active'
       RETURNING *`,
      [executionId, userId]
    );
    if (rs.rows.length === 0) {
      return res.status(404).json({ error: 'Aktivna sesija nije pronadjena' });
    }
    res.status(200).json(rs.rows[0]);
  } catch (error) {
    console.error('Greska pri napustanju ture:', error);
    res.status(500).json({ error: 'Greška pri napustanju ture' });
  }
};

module.exports = {
  purchaseTour,
  startTour,
  checkStatus,
  completeTour,
  abandonTour,
};
