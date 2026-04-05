const likeService = require('../services/likeService');

async function likeBlog(req, res) {
  try {
    const like = await likeService.likeBlog(parseInt(req.params.id), req.user.id);
    res.status(201).json(like);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function unlikeBlog(req, res) {
  try {
    await likeService.unlikeBlog(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { likeBlog, unlikeBlog };
