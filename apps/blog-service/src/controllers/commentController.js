const { pool } = require('../config/database');

async function createComment(req, res) {
	const { id: blog_id } = req.params;
	const { text } = req.body;
	const { user_id, username } = req.user;

	if (!text) {
		return res.status(400).json({ error: 'Tekst komentara je obavezan' });
	}

	try {
		const blogCheck = await pool.query('SELECT id FROM blogs WHERE id = $1', [
			blog_id,
		]);
		if (blogCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Blog nije pronadjen' });
		}

		const result = await pool.query(
			`INSERT INTO comments (blog_id, user_id, username, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
			[blog_id, user_id, username, text],
		);

		return res.status(201).json(result.rows[0]);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri kreiranju komentara' });
	}
}

async function getComments(req, res) {
	const { id: blog_id } = req.params;

	try {
		const blogCheck = await pool.query('SELECT id FROM blogs WHERE id = $1', [
			blog_id,
		]);
		if (blogCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Blog nije pronadjen' });
		}

		const result = await pool.query(
			'SELECT * FROM comments WHERE blog_id = $1 ORDER BY created_at ASC',
			[blog_id],
		);

		return res.json(result.rows);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri dohvatanju komentara' });
	}
}

async function updateComment(req, res) {
	const { id: blog_id, comment_id } = req.params;
	const { text } = req.body;
	const { user_id } = req.user;

	if (!text) {
		return res.status(400).json({ error: 'Tekst komentara je obavezan' });
	}

	try {
		const commentCheck = await pool.query(
			'SELECT * FROM comments WHERE id = $1 AND blog_id = $2',
			[comment_id, blog_id],
		);

		if (commentCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Komentar nije pronadjen' });
		}

		if (commentCheck.rows[0].user_id !== user_id) {
			return res
				.status(403)
				.json({ error: 'Nemate pravo da menjate ovaj komentar' });
		}

		const result = await pool.query(
			`UPDATE comments SET text = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
			[text, comment_id],
		);

		return res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Greska pri izmeni komentara' });
	}
}

module.exports = { createComment, getComments, updateComment };
