const { pool } = require('../config/database');
const { marked } = require('marked');
const axios = require('axios');

const FOLLOWER_SERVICE_URL =
	process.env.FOLLOWER_SERVICE_URL || 'http://localhost:8084';

async function getAllowedAuthorIds(userId) {
	try {
		const response = await axios.get(
			`${FOLLOWER_SERVICE_URL}/internal/following/${userId}?includeSelf=1`,
		);
		const allowed = Array.isArray(response.data?.allowed)
			? response.data.allowed.map((x) => parseInt(x))
			: [parseInt(userId)];
		return allowed.filter((x) => Number.isFinite(x));
	} catch (err) {
		const status = err?.response?.status;
		const message = err?.response?.data?.error;
		throw new Error(
			`Follower service unavailable (${status || 'no-status'}): ${message || 'error'}`,
		);
	}
}

async function createBlog(req, res) {
	const { title, description, images } = req.body;
	const { user_id, username } = req.user;

	if (!title || !description) {
		return res.status(400).json({ error: 'Naslov i opis su obavezni' });
	}

	try {
		const result = await pool.query(
			`INSERT INTO blogs (user_id, username, title, description, images)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
			[user_id, username, title, description, images || []],
		);

		const blog = result.rows[0];
		blog.description_html = marked(blog.description);

		const likesResult = await pool.query(
			'SELECT COUNT(*) FROM likes WHERE blog_id = $1',
			[blog.id],
		);
		blog.likes_count = parseInt(likesResult.rows[0].count);

		return res.status(201).json(blog);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri kreiranju bloga' });
	}
}

async function getBlogs(req, res) {
	try {
		const { user_id } = req.user;
		const allowedAuthorIds = await getAllowedAuthorIds(user_id);
		if (allowedAuthorIds.length === 0) {
			return res.json([]);
		}

		const result = await pool.query(
			`SELECT b.*,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) AS likes_count
       FROM blogs b
		 WHERE b.user_id = ANY($1::int[])
       ORDER BY b.created_at DESC`,
			[allowedAuthorIds],
		);

		const blogs = result.rows.map((blog) => ({
			...blog,
			description_html: marked(blog.description),
			likes_count: parseInt(blog.likes_count),
		}));

		return res.json(blogs);
	} catch (err) {
		console.error(err);
		if (String(err?.message || '').includes('Follower service unavailable')) {
			return res
				.status(503)
				.json({ error: 'Follower servis nije dostupan' });
		}
		return res.status(500).json({ error: 'Greska pri dohvatanju blogova' });
	}
}

async function getBlog(req, res) {
	const { id } = req.params;

	try {
		const { user_id } = req.user;
		const allowedAuthorIds = await getAllowedAuthorIds(user_id);

		const result = await pool.query(
			`SELECT b.*,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) AS likes_count
       FROM blogs b
       WHERE b.id = $1`,
			[id],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Blog nije pronadjen' });
		}

		const blog = result.rows[0];
		if (!allowedAuthorIds.includes(parseInt(blog.user_id))) {
			return res
				.status(403)
				.json({ error: 'Nemate pristup blogovima korisnika koje ne pratite' });
		}

		blog.description_html = marked(blog.description);
		blog.likes_count = parseInt(blog.likes_count);

		return res.json(blog);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri dohvatanju bloga' });
	}
}

module.exports = { createBlog, getBlogs, getBlog };
