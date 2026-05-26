const { pool } = require('../config/database');
const crypto = require('crypto');
const axios = require('axios');

const stakeholderServiceUrl = process.env.STAKEHOLDER_SERVICE_URL || 'http://stakeholder-service:8082';

const getOrCreateCart = async (touristId) => {
	const existing = await pool.query(
		'SELECT * FROM shopping_carts WHERE tourist_id = $1',
		[touristId],
	);
	if (existing.rows.length > 0) return existing.rows[0];

	const created = await pool.query(
		'INSERT INTO shopping_carts (tourist_id, total_price) VALUES ($1, 0) RETURNING *',
		[touristId],
	);
	return created.rows[0];
};

const recalculateTotal = async (cartId) => {
	await pool.query(
		`UPDATE shopping_carts
     SET total_price = (SELECT COALESCE(SUM(price), 0) FROM order_items WHERE cart_id = $1)
     WHERE id = $1`,
		[cartId],
	);
};

const getCart = async (req, res) => {
	const touristId = req.user.user_id;

	try {
		const cart = await getOrCreateCart(touristId);

		const items = await pool.query(
			'SELECT * FROM order_items WHERE cart_id = $1 ORDER BY created_at ASC',
			[cart.id],
		);

		const updatedCart = await pool.query(
			'SELECT * FROM shopping_carts WHERE id = $1',
			[cart.id],
		);

		res.status(200).json({
			...updatedCart.rows[0],
			items: items.rows,
		});
	} catch (error) {
		console.error('Greška pri dohvatanju korpe:', error);
		res.status(500).json({ error: 'Serverska greška pri dohvatanju korpe' });
	}
};

const addToCart = async (req, res) => {
	const touristId = req.user.user_id;
	const tourId = parseInt(req.params.tourId);

	try {
		const tourResult = await pool.query(
			'SELECT id, title, price, status FROM tours WHERE id = $1',
			[tourId],
		);

		if (tourResult.rows.length === 0) {
			return res.status(404).json({ error: 'Tura nije pronađena' });
		}

		const tour = tourResult.rows[0];

		if (tour.status === 'archived') {
			return res.status(400).json({ error: 'Arhivirana tura se ne može kupiti' });
		}

		if (tour.status !== 'published') {
			return res.status(400).json({ error: 'Tura nije objavljena' });
		}

		const alreadyPurchased = await pool.query(
			'SELECT id FROM tour_purchase_tokens WHERE tourist_id = $1 AND tour_id = $2',
			[touristId, tourId],
		);
		if (alreadyPurchased.rows.length > 0) {
			return res.status(400).json({ error: 'Tura je već kupljena' });
		}

		const cart = await getOrCreateCart(touristId);

		await pool.query(
			`INSERT INTO order_items (cart_id, tour_id, tour_name, price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_id, tour_id) DO NOTHING`,
			[cart.id, tourId, tour.title, tour.price],
		);

		await recalculateTotal(cart.id);

		const updatedCart = await pool.query(
			'SELECT * FROM shopping_carts WHERE id = $1',
			[cart.id],
		);
		const items = await pool.query(
			'SELECT * FROM order_items WHERE cart_id = $1 ORDER BY created_at ASC',
			[cart.id],
		);

		res.status(200).json({ ...updatedCart.rows[0], items: items.rows });
	} catch (error) {
		console.error('Greška pri dodavanju u korpu:', error);
		res.status(500).json({ error: 'Serverska greška pri dodavanju u korpu' });
	}
};

const removeFromCart = async (req, res) => {
	const touristId = req.user.user_id;
	const tourId = parseInt(req.params.tourId);

	try {
		const cart = await getOrCreateCart(touristId);

		await pool.query(
			'DELETE FROM order_items WHERE cart_id = $1 AND tour_id = $2',
			[cart.id, tourId],
		);

		await recalculateTotal(cart.id);

		const updatedCart = await pool.query(
			'SELECT * FROM shopping_carts WHERE id = $1',
			[cart.id],
		);
		const items = await pool.query(
			'SELECT * FROM order_items WHERE cart_id = $1 ORDER BY created_at ASC',
			[cart.id],
		);

		res.status(200).json({ ...updatedCart.rows[0], items: items.rows });
	} catch (error) {
		console.error('Greška pri uklanjanju iz korpe:', error);
		res.status(500).json({ error: 'Serverska greška pri uklanjanju iz korpe' });
	}
};

const checkout = async (req, res) => {
	const touristId = req.user.user_id;

	try {
		const cart = await getOrCreateCart(touristId);

		const items = await pool.query(
			'SELECT * FROM order_items WHERE cart_id = $1',
			[cart.id],
		);

		if (items.rows.length === 0) {
			return res.status(400).json({ error: 'Korpa je prazna' });
		}

		// Proveriti da li su sve ture dostupne
		for (const item of items.rows) {
			const tourCheck = await pool.query(
				'SELECT status FROM tours WHERE id = $1',
				[item.tour_id],
			);
			if (tourCheck.rows.length === 0 || tourCheck.rows[0].status === 'archived') {
				return res.status(400).json({
					error: `Tura "${item.tour_name}" nije dostupna za kupovinu`,
				});
			}
		}

		// Izračunati ukupnu cenu
		const totalResult = await pool.query(
			'SELECT COALESCE(SUM(price), 0) AS total FROM order_items WHERE cart_id = $1',
			[cart.id],
		);
		const totalAmount = parseFloat(totalResult.rows[0].total);

		// Skinuti balans kod stakeholder-service
		if (totalAmount > 0) {
			try {
				await axios.post(`${stakeholderServiceUrl}/internal/balance/deduct`, {
					user_id: touristId,
					amount: totalAmount,
				});
			} catch (err) {
				if (err.response?.status === 402) {
					return res.status(402).json({ error: 'Nedovoljan balans za kupovinu' });
				}
				throw err;
			}
		}

		const tokens = [];

		for (const item of items.rows) {
			const token = crypto.randomBytes(32).toString('hex');

			await pool.query(
				`INSERT INTO tour_purchase_tokens (tourist_id, tour_id, token)
         VALUES ($1, $2, $3)
         ON CONFLICT (tourist_id, tour_id) DO NOTHING`,
				[touristId, item.tour_id, token],
			);

			tokens.push({
				tour_id: item.tour_id,
				tour_name: item.tour_name,
				token,
			});
		}

		await pool.query('DELETE FROM order_items WHERE cart_id = $1', [cart.id]);
		await recalculateTotal(cart.id);

		res.status(200).json({ message: 'Kupovina uspešna', tokens });
	} catch (error) {
		console.error('Greška pri checkout-u:', error);
		res.status(500).json({ error: 'Serverska greška pri checkout-u' });
	}
};

const getPublishedTours = async (req, res) => {
	const touristId = req.user.user_id;

	try {
		const result = await pool.query(
			`SELECT
        t.id, t.user_id, t.title, t.description, t.difficulty, t.tags,
        t.status, t.price, t.created_at,
        (
          SELECT json_build_object(
            'id', kp.id, 'name', kp.name, 'description', kp.description,
            'latitude', kp.latitude, 'longitude', kp.longitude, 'image_url', kp.image_url
          )
          FROM tour_key_points kp WHERE kp.tour_id = t.id ORDER BY kp.id ASC LIMIT 1
        ) AS starting_point,
        (SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) FROM tour_reviews r WHERE r.tour_id = t.id) AS avg_rating,
        (SELECT COUNT(*) FROM tour_reviews r WHERE r.tour_id = t.id) AS review_count,
        EXISTS(
          SELECT 1 FROM tour_purchase_tokens tpt
          WHERE tpt.tourist_id = $1 AND tpt.tour_id = t.id
        ) AS is_purchased,
        EXISTS(
          SELECT 1 FROM order_items oi
          JOIN shopping_carts sc ON sc.id = oi.cart_id
          WHERE sc.tourist_id = $1 AND oi.tour_id = t.id
        ) AS in_cart
      FROM tours t
      WHERE t.status = 'published'
      ORDER BY t.created_at DESC`,
			[touristId],
		);

		res.status(200).json(result.rows);
	} catch (error) {
		console.error('Greška pri dohvatanju objavljenih tura:', error);
		res.status(500).json({ error: 'Serverska greška' });
	}
};

const getPurchasedTours = async (req, res) => {
	const touristId = req.user.user_id;

	try {
		const result = await pool.query(
			`SELECT
        t.*,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', kp.id, 'name', kp.name, 'description', kp.description,
              'latitude', kp.latitude, 'longitude', kp.longitude, 'image_url', kp.image_url
            ) ORDER BY kp.id
          ), '[]')
          FROM tour_key_points kp WHERE kp.tour_id = t.id
        ) AS key_points,
        (SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) FROM tour_reviews r WHERE r.tour_id = t.id) AS avg_rating,
        (SELECT COUNT(*) FROM tour_reviews r WHERE r.tour_id = t.id) AS review_count,
        tpt.token,
        tpt.purchased_at
      FROM tours t
      JOIN tour_purchase_tokens tpt ON tpt.tour_id = t.id
      WHERE tpt.tourist_id = $1
      ORDER BY tpt.purchased_at DESC`,
			[touristId],
		);

		res.status(200).json(result.rows);
	} catch (error) {
		console.error('Greška pri dohvatanju kupljenih tura:', error);
		res.status(500).json({ error: 'Serverska greška' });
	}
};

module.exports = {
	getCart,
	addToCart,
	removeFromCart,
	checkout,
	getPublishedTours,
	getPurchasedTours,
};
