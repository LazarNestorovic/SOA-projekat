const { pool } = require('../config/database');

async function likeBlog(req, res) {
  const { id: blog_id } = req.params;
  const { user_id } = req.user;

  try {
    const blogCheck = await pool.query('SELECT id FROM blogs WHERE id = $1', [blog_id]);
    if (blogCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Blog nije pronađen' });
    }

    await pool.query(
      'INSERT INTO likes (blog_id, user_id) VALUES ($1, $2)',
      [blog_id, user_id]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE blog_id = $1',
      [blog_id]
    );

    return res.status(201).json({ likes_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Već ste lajkovali ovaj blog' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Greška pri lajkovanju bloga' });
  }
}

async function unlikeBlog(req, res) {
  const { id: blog_id } = req.params;
  const { user_id } = req.user;

  try {
    const blogCheck = await pool.query('SELECT id FROM blogs WHERE id = $1', [blog_id]);
    if (blogCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Blog nije pronađen' });
    }

    const result = await pool.query(
      'DELETE FROM likes WHERE blog_id = $1 AND user_id = $2',
      [blog_id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Niste lajkovali ovaj blog' });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE blog_id = $1',
      [blog_id]
    );

    return res.json({ likes_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Greška pri uklanjanju lajka' });
  }
}

module.exports = { likeBlog, unlikeBlog };
