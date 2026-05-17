const { pool } = require('../config/database');

const createTour = async (req, res) => {
	const { title, description, difficulty, tags } = req.body;
	const userId = req.user.user_id;

	if (!title || !description || !difficulty) {
		return res.status(400).json({ error: 'Naslov, opis i težina su obavezni' });
	}

	const status = 'draft';
	const price = 0;
	const tourTags = tags && Array.isArray(tags) ? tags : [];

	try {
		const result = await pool.query(
			`INSERT INTO tours (user_id, title, description, difficulty, tags, status, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
			[userId, title, description, difficulty, tourTags, status, price],
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri kreiranju ture:', error);
		res.status(500).json({ error: 'Serverska greška pri kreiranju ture' });
	}
};

const getMyTours = async (req, res) => {
	const userId = req.user.user_id;

	try {
		const result = await pool.query(
			`SELECT t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', kp.id,
              'name', kp.name,
              'description', kp.description,
              'latitude', kp.latitude,
              'longitude', kp.longitude,
              'image_url', kp.image_url
						) ORDER BY kp.id
          ) FILTER (WHERE kp.id IS NOT NULL), '[]'
        ) AS key_points
       FROM tours t
       LEFT JOIN tour_key_points kp ON t.id = kp.tour_id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
			[userId],
		);

		res.status(200).json(result.rows);
	} catch (error) {
		console.error('Greška pri dohvatanju tura:', error);
		res.status(500).json({ error: 'Serverska greška pri dohvatanju tura' });
	}
};

const getAllTours = async (req, res) => {
	try {
		const result = await pool.query(`
      SELECT t.*,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', kp.id, 'name', kp.name, 'description', kp.description,
            'latitude', kp.latitude, 'longitude', kp.longitude, 'image_url', kp.image_url
					) ORDER BY kp.id), '[]')
          FROM tour_key_points kp WHERE kp.tour_id = t.id
        ) AS key_points,
        (SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) FROM tour_reviews r WHERE r.tour_id = t.id) AS avg_rating,
        (SELECT COUNT(*) FROM tour_reviews r WHERE r.tour_id = t.id) AS review_count
      FROM tours t
      ORDER BY t.created_at DESC
    `);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error('Greška pri dohvatanju svih tura:', error);
		res.status(500).json({ error: 'Serverska greška' });
	}
};

const addKeyPoint = async (req, res) => {
	const { id } = req.params;
	const { name, description, latitude, longitude, image_url } = req.body;
	const userId = req.user.user_id;

	if (!name || latitude === undefined || longitude === undefined) {
		return res
			.status(400)
			.json({ error: 'Naziv, širina i dužina su obavezni' });
	}

	try {
		const tourQuery = await pool.query(
			'SELECT user_id FROM tours WHERE id = $1',
			[id],
		);
		if (tourQuery.rows.length === 0) {
			return res.status(404).json({ error: 'Tura nije pronađena' });
		}
		if (tourQuery.rows[0].user_id !== userId && req.user.role !== 'admin') {
			return res
				.status(403)
				.json({ error: 'Nemate pravo da menjate ovu turu' });
		}

		const result = await pool.query(
			`INSERT INTO tour_key_points (tour_id, name, description, latitude, longitude, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
			[id, name, description, latitude, longitude, image_url],
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri dodavanju ključne tačke:', error);
		res
			.status(500)
			.json({ error: 'Serverska greška pri dodavanju ključne tačke' });
	}
};

const updateKeyPoint = async (req, res) => {
	const { keyPointId } = req.params;
	const { name, description, latitude, longitude, image_url } = req.body;
	const userId = req.user.user_id;

	if (!name || latitude === undefined || longitude === undefined) {
		return res
			.status(400)
			.json({ error: 'Naziv, širina i dužina su obavezni' });
	}

	const parsedLatitude = Number(latitude);
	const parsedLongitude = Number(longitude);

	if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
		return res
			.status(400)
			.json({ error: 'Latitude i longitude moraju biti brojevi' });
	}

	if (
		parsedLatitude < -90 ||
		parsedLatitude > 90 ||
		parsedLongitude < -180 ||
		parsedLongitude > 180
	) {
		return res.status(400).json({ error: 'Neispravne koordinate' });
	}

	try {
		const keyPointQuery = await pool.query(
			`SELECT kp.id, kp.tour_id, t.user_id
			 FROM tour_key_points kp
			 JOIN tours t ON t.id = kp.tour_id
			 WHERE kp.id = $1`,
			[keyPointId],
		);

		if (keyPointQuery.rows.length === 0) {
			return res.status(404).json({ error: 'Ključna tačka nije pronađena' });
		}

		if (keyPointQuery.rows[0].user_id !== userId && req.user.role !== 'admin') {
			return res
				.status(403)
				.json({ error: 'Nemate pravo da menjate ovu ključnu tačku' });
		}

		const result = await pool.query(
			`UPDATE tour_key_points
			 SET name = $1,
					 description = $2,
					 latitude = $3,
					 longitude = $4,
					 image_url = $5
			 WHERE id = $6
			 RETURNING *`,
			[
				name,
				description || '',
				parsedLatitude,
				parsedLongitude,
				image_url || '',
				keyPointId,
			],
		);

		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri izmeni ključne tačke:', error);
		res
			.status(500)
			.json({ error: 'Serverska greška pri izmeni ključne tačke' });
	}
};

const deleteKeyPoint = async (req, res) => {
	const { keyPointId } = req.params;
	const userId = req.user.user_id;

	try {
		const keyPointQuery = await pool.query(
			`SELECT kp.id, kp.tour_id, t.user_id
			 FROM tour_key_points kp
			 JOIN tours t ON t.id = kp.tour_id
			 WHERE kp.id = $1`,
			[keyPointId],
		);

		if (keyPointQuery.rows.length === 0) {
			return res.status(404).json({ error: 'Ključna tačka nije pronađena' });
		}

		if (keyPointQuery.rows[0].user_id !== userId && req.user.role !== 'admin') {
			return res
				.status(403)
				.json({ error: 'Nemate pravo da obrišete ovu ključnu tačku' });
		}

		await pool.query('DELETE FROM tour_key_points WHERE id = $1', [keyPointId]);
		res.status(204).send();
	} catch (error) {
		console.error('Greška pri brisanju ključne tačke:', error);
		res
			.status(500)
			.json({ error: 'Serverska greška pri brisanju ključne tačke' });
	}
};

const createReview = async (req, res) => {
	const { id } = req.params;
	const { rating, comment, visit_date, images } = req.body;
	const userId = req.user.user_id;
	const username = req.user.username;

	const parsedRating = parseInt(rating);
	if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
		return res.status(400).json({ error: 'Ocena mora biti između 1 i 5' });
	}
	if (!visit_date) {
		return res.status(400).json({ error: 'Datum posete je obavezan' });
	}

	try {
		const tourQuery = await pool.query('SELECT id FROM tours WHERE id = $1', [
			id,
		]);
		if (tourQuery.rows.length === 0) {
			return res.status(404).json({ error: 'Tura nije pronađena' });
		}

		const reviewImages = Array.isArray(images) ? images.filter(Boolean) : [];

		const result = await pool.query(
			`INSERT INTO tour_reviews (tour_id, tourist_id, tourist_name, rating, comment, visit_date, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
			[
				id,
				userId,
				username,
				parsedRating,
				comment || '',
				visit_date,
				reviewImages,
			],
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri dodavanju recenzije:', error);
		res.status(500).json({ error: 'Serverska greška pri dodavanju recenzije' });
	}
};

const getReviews = async (req, res) => {
	const { id } = req.params;
	try {
		const result = await pool.query(
			`SELECT * FROM tour_reviews WHERE tour_id = $1 ORDER BY created_at DESC`,
			[id],
		);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error('Greška pri dohvatanju recenzija:', error);
		res.status(500).json({ error: 'Serverska greška' });
	}
};

const getCurrentPosition = async (req, res) => {
	const userId = req.user.user_id;

	try {
		const result = await pool.query(
			`SELECT latitude, longitude, updated_at
       FROM tourist_current_positions
       WHERE tourist_id = $1`,
			[userId],
		);

		if (result.rows.length === 0) {
			return res.status(200).json(null);
		}

		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri čitanju trenutne pozicije:', error);
		res
			.status(500)
			.json({ error: 'Serverska greška pri čitanju trenutne pozicije' });
	}
};

const upsertCurrentPosition = async (req, res) => {
	const userId = req.user.user_id;
	const { latitude, longitude } = req.body;

	const parsedLatitude = Number(latitude);
	const parsedLongitude = Number(longitude);

	if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
		return res
			.status(400)
			.json({ error: 'Latitude i longitude moraju biti brojevi' });
	}

	if (
		parsedLatitude < -90 ||
		parsedLatitude > 90 ||
		parsedLongitude < -180 ||
		parsedLongitude > 180
	) {
		return res.status(400).json({ error: 'Neispravne koordinate' });
	}

	try {
		const result = await pool.query(
			`INSERT INTO tourist_current_positions (tourist_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (tourist_id)
       DO UPDATE SET latitude = EXCLUDED.latitude,
                     longitude = EXCLUDED.longitude,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING latitude, longitude, updated_at`,
			[userId, parsedLatitude, parsedLongitude],
		);

		res.status(200).json(result.rows[0]);
	} catch (error) {
		console.error('Greška pri čuvanju trenutne pozicije:', error);
		res
			.status(500)
			.json({ error: 'Serverska greška pri čuvanju trenutne pozicije' });
	}
};

module.exports = {
	createTour,
	getMyTours,
	getAllTours,
	addKeyPoint,
	updateKeyPoint,
	deleteKeyPoint,
	createReview,
	getReviews,
	getCurrentPosition,
	upsertCurrentPosition,
};
