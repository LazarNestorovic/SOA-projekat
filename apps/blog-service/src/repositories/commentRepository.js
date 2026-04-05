const pool = require('../config/database');

async function createComment({ blogId, userId, username, text }) {
  const result = await pool.query(
    `INSERT INTO comments (blog_id, user_id, username, text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [blogId, userId, username, text]
  );
  return result.rows[0];
}

async function getCommentsByBlogId(blogId) {
  const result = await pool.query(
    `SELECT * FROM comments WHERE blog_id = $1 ORDER BY created_at ASC`,
    [blogId]
  );
  return result.rows;
}

async function getCommentById(id) {
  const result = await pool.query(`SELECT * FROM comments WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function updateComment(id, text) {
  const result = await pool.query(
    `UPDATE comments SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [text, id]
  );
  return result.rows[0] || null;
}

module.exports = { createComment, getCommentsByBlogId, getCommentById, updateComment };
