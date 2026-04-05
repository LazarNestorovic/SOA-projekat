const commentService = require('../services/commentService');

async function addComment(req, res) {
  try {
    const { text } = req.body;
    const comment = await commentService.addComment(
      parseInt(req.params.id),
      req.user.id,
      req.user.username,
      text
    );
    res.status(201).json(comment);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function editComment(req, res) {
  try {
    const { text } = req.body;
    const comment = await commentService.editComment(
      parseInt(req.params.commentId),
      req.user.id,
      text
    );
    res.json(comment);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { addComment, editComment };
