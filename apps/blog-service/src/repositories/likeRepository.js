const pool = require('../config/database');

async function addLike(blogId, userId) {
  const result = await pool.query(
    `INSERT INTO likes (blog_id, user_id) VALUES ($1, $2) RETURNING *`,
    [blogId, userId]
  );
  return result.rows[0];
}

async function removeLike(blogId, userId) {
  const result = await pool.query(
    `DELETE FROM likes WHERE blog_id = $1 AND user_id = $2 RETURNING *`,
    [blogId, userId]
  );
  return result.rows[0] || null;
}

async function getLike(blogId, userId) {
  const result = await pool.query(
    `SELECT * FROM likes WHERE blog_id = $1 AND user_id = $2`,
    [blogId, userId]
  );
  return result.rows[0] || null;
}

module.exports = { addLike, removeLike, getLike };
