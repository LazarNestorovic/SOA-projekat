const { pool } = require('../config/database');

// Allowed transport types for travel times
const TRANSPORT_TYPES = ['peske', 'bicikl', 'automobil'];

function haversineKm(lat1, lon1, lat2, lon2) {
	const toRad = (v) => (v * Math.PI) / 180;
	const R = 6371; // Earth radius km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

async function recomputeTourDistance(tourId) {
	const kpRes = await pool.query(
		'SELECT latitude::float AS lat, longitude::float AS lon FROM tour_key_points WHERE tour_id = $1 ORDER BY id',
		[tourId],
	);
	const pts = kpRes.rows;
	if (pts.length < 2) {
		await pool.query('UPDATE tours SET distance_km = 0 WHERE id = $1', [
			tourId,
		]);
		return 0;
	}
	let total = 0;
	for (let i = 1; i < pts.length; i++) {
		total += haversineKm(
			pts[i - 1].lat,
			pts[i - 1].lon,
			pts[i].lat,
			pts[i].lon,
		);
	}
	// Round to 3 decimals
	total = Math.round(total * 1000) / 1000;
	await pool.query('UPDATE tours SET distance_km = $1 WHERE id = $2', [
		total,
		tourId,
	]);
	return total;
}

function normalizeTransportTimes(transportTimes) {
	const tt =
		transportTimes && typeof transportTimes === 'object' ? transportTimes : {};
	const validKeys = Object.keys(tt).filter(
		(k) =>
			TRANSPORT_TYPES.includes(k) &&
			Number.isFinite(Number(tt[k])) &&
			Number(tt[k]) > 0,
	);
	const finalTransportTimes = {};
	for (const k of validKeys) finalTransportTimes[k] = Number(tt[k]);
	if (Object.keys(finalTransportTimes).length === 0) {
		const error = new Error(
			'Morate uneti bar jedno vreme obilaska za prevoz (peške, bicikl ili automobil)',
		);
		error.statusCode = 400;
		throw error;
	}
	return finalTransportTimes;
}

function ensureTourCanBePublished(tour, keyPointCount) {
	if (!tour.title || !tour.description || !tour.difficulty) {
		const error = new Error(
			'Tura nema sve osnovne podatke (naziv, opis, težina)',
		);
		error.statusCode = 400;
		throw error;
	}
	if (!tour.tags || tour.tags.length < 1) {
		const error = new Error('Tura mora imati bar jednu oznaku (tag)');
		error.statusCode = 400;
		throw error;
	}
	if (keyPointCount < 2) {
		const error = new Error('Tura mora imati bar dve ključne tačke');
		error.statusCode = 400;
		throw error;
	}
	const tt = tour.transport_times || {};
	if (!Object.values(tt).some((value) => Number(value) > 0)) {
		const error = new Error(
			'Tura mora imati definisano bar jedno vreme obilaska u zavisnosti od prevoza',
		);
		error.statusCode = 400;
		throw error;
	}
}

function toTourDto(row) {
	if (!row) return null;
	return {
		id: Number(row.id),
		user_id: Number(row.user_id),
		title: row.title,
		description: row.description,
		difficulty: row.difficulty,
		tags: row.tags || [],
		status: row.status,
		price: Number(row.price || 0),
		distance_km: Number(row.distance_km || 0),
		transport_times: row.transport_times || {},
		published_at: row.published_at
			? new Date(row.published_at).toISOString()
			: '',
		archived_at: row.archived_at ? new Date(row.archived_at).toISOString() : '',
		created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
	};
}

async function createTourRecord({
	userId,
	title,
	description,
	difficulty,
	tags,
	price,
	transportTimes,
}) {
	if (!title || !description || !difficulty) {
		const error = new Error('Naslov, opis i težina su obavezni');
		error.statusCode = 400;
		throw error;
	}

	const parsedPrice = Math.max(0, parseFloat(price) || 0);
	const tourTags = tags && Array.isArray(tags) ? tags : [];
	const finalTransportTimes = normalizeTransportTimes(transportTimes);

	const result = await pool.query(
		`INSERT INTO tours (user_id, title, description, difficulty, tags, status, price, transport_times)
		 VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7) RETURNING *`,
		[
			userId,
			title,
			description,
			difficulty,
			tourTags,
			parsedPrice,
			finalTransportTimes,
		],
	);

	return result.rows[0];
}

async function updateTourStatusRecord({ id, userId, role, status }) {
	const allowed = ['draft', 'published', 'archived'];
	if (!allowed.includes(status)) {
		const error = new Error('Nevalidan status');
		error.statusCode = 400;
		throw error;
	}

	const tourQuery = await pool.query(
		'SELECT user_id FROM tours WHERE id = $1',
		[id],
	);
	if (tourQuery.rows.length === 0) {
		const error = new Error('Tura nije pronađena');
		error.statusCode = 404;
		throw error;
	}
	if (tourQuery.rows[0].user_id !== userId && role !== 'admin') {
		const error = new Error('Nemate pravo da menjate ovu turu');
		error.statusCode = 403;
		throw error;
	}

	if (status === 'published') {
		const tourRes = await pool.query(
			'SELECT title, description, difficulty, tags, transport_times FROM tours WHERE id = $1',
			[id],
		);
		if (tourRes.rows.length === 0) {
			const error = new Error('Tura nije pronađena');
			error.statusCode = 404;
			throw error;
		}
		const t = tourRes.rows[0];
		const kpRes = await pool.query(
			'SELECT COUNT(*)::int AS cnt FROM tour_key_points WHERE tour_id = $1',
			[id],
		);
		ensureTourCanBePublished(t, kpRes.rows[0].cnt);
	}

	let result;
	if (status === 'published') {
		result = await pool.query(
			`UPDATE tours
			 SET status = 'published',
			     published_at = CURRENT_TIMESTAMP,
			     archived_at = NULL
			 WHERE id = $1
			 RETURNING *`,
			[id],
		);
	} else if (status === 'archived') {
		result = await pool.query(
			`UPDATE tours
			 SET status = 'archived',
			     archived_at = CURRENT_TIMESTAMP
			 WHERE id = $1
			 RETURNING *`,
			[id],
		);
	} else {
		result = await pool.query(
			`UPDATE tours
			 SET status = 'draft'
			 WHERE id = $1
			 RETURNING *`,
			[id],
		);
	}

	return result.rows[0];
}

const createTour = async (req, res) => {
	const { title, description, difficulty, tags, price, transport_times } =
		req.body;
	const userId = req.user.user_id;

	try {
		const tour = await createTourRecord({
			userId,
			title,
			description,
			difficulty,
			tags,
			price,
			transportTimes: transport_times,
		});

		res.status(201).json(tour);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		console.error('Greška pri kreiranju ture:', error);
		res
			.status(statusCode)
			.json({ error: error.message || 'Serverska greška pri kreiranju ture' });
	}
};

const updateTourStatus = async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	const userId = req.user.user_id;

	try {
		const tour = await updateTourStatusRecord({
			id: Number(id),
			userId,
			role: req.user.role,
			status,
		});
		res.status(200).json(tour);
	} catch (error) {
		const statusCode = error.statusCode || 500;
		console.error('Greška pri promeni statusa:', error);
		res
			.status(statusCode)
			.json({ error: error.message || 'Serverska greška pri promeni statusa' });
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
	const userRole = req.user?.role;
	const isTourist = userRole === 'tourist' || userRole === 'turist';

	try {
		if (isTourist) {
			const result = await pool.query(
				`SELECT
					t.id, t.user_id, t.title, t.description, t.difficulty, t.tags,
					t.status, t.price, t.distance_km, t.transport_times,
					t.published_at, t.archived_at, t.created_at,
					(
						SELECT json_build_object(
							'id', kp.id, 'name', kp.name, 'description', kp.description,
							'latitude', kp.latitude, 'longitude', kp.longitude, 'image_url', kp.image_url
						)
						FROM tour_key_points kp WHERE kp.tour_id = t.id ORDER BY kp.id ASC LIMIT 1
					) AS starting_point,
					(SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) FROM tour_reviews r WHERE r.tour_id = t.id) AS avg_rating,
					(SELECT COUNT(*) FROM tour_reviews r WHERE r.tour_id = t.id) AS review_count
				FROM tours t
				WHERE t.status = 'published'
				ORDER BY t.created_at DESC`,
			);

			return res.status(200).json(result.rows);
		}

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

		// After inserting, if this is at least the 2nd keypoint, recompute total distance
		try {
			const countRes = await pool.query(
				'SELECT COUNT(*)::int AS cnt FROM tour_key_points WHERE tour_id = $1',
				[id],
			);
			const cnt = countRes.rows[0].cnt;
			if (cnt >= 2) {
				const total = await recomputeTourDistance(id);
				const out = result.rows[0];
				out.tour_distance_km = total;
				return res.status(201).json(out);
			}
			return res.status(201).json(result.rows[0]);
		} catch (err) {
			console.error('Greška pri računanju udaljenosti ture:', err);
			return res.status(201).json(result.rows[0]);
		}
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

		// Recompute tour distance after update
		try {
			await recomputeTourDistance(result.rows[0].tour_id);
		} catch (e) {
			console.error('Greška pri rekalkulaciji udaljenosti nakon izmene KP:', e);
		}
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
		// recompute distance
		try {
			await recomputeTourDistance(keyPointQuery.rows[0].tour_id);
		} catch (e) {
			console.error(
				'Greška pri rekalkulaciji udaljenosti nakon brisanja KP:',
				e,
			);
		}
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
	updateTourStatus,
	createTourRecord,
	updateTourStatusRecord,
	toTourDto,
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
