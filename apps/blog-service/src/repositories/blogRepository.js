const pool = require('../config/database');

async function createBlog({ userId, title, description, imageUrls }) {
  const result = await pool.query(
    `INSERT INTO blogs (user_id, title, description, image_urls)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, description, imageUrls || []]
  );
  return result.rows[0];
}

async function getBlogById(id) {
  const result = await pool.query(
    `SELECT b.*,
            COUNT(DISTINCT l.id) AS like_count
     FROM blogs b
     LEFT JOIN likes l ON l.blog_id = b.id
     WHERE b.id = $1
     GROUP BY b.id`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAllBlogs() {
  const result = await pool.query(
    `SELECT b.*,
            COUNT(DISTINCT l.id) AS like_count
     FROM blogs b
     LEFT JOIN likes l ON l.blog_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  );
  return result.rows;
}

module.exports = { createBlog, getBlogById, getAllBlogs };
