const { pool } = require('../config/database');
const { marked } = require('marked');

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
		const result = await pool.query(
			`SELECT b.*,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) AS likes_count
       FROM blogs b
       ORDER BY b.created_at DESC`,
		);

		const blogs = result.rows.map((blog) => ({
			...blog,
			description_html: marked(blog.description),
			likes_count: parseInt(blog.likes_count),
		}));

		return res.json(blogs);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri dohvatanju blogova' });
	}
}

async function getBlog(req, res) {
	const { id } = req.params;

	try {
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
		blog.description_html = marked(blog.description);
		blog.likes_count = parseInt(blog.likes_count);

		return res.json(blog);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri dohvatanju bloga' });
	}
}

module.exports = { createBlog, getBlogs, getBlog };
