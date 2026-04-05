const blogService = require('../services/blogService');

async function createBlog(req, res) {
  try {
    const blog = await blogService.createBlog(req.user.id, req.body);
    res.status(201).json(blog);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function getBlog(req, res) {
  try {
    const blog = await blogService.getBlog(parseInt(req.params.id));
    res.json(blog);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function getAllBlogs(req, res) {
  try {
    const blogs = await blogService.getAllBlogs();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createBlog, getBlog, getAllBlogs };
