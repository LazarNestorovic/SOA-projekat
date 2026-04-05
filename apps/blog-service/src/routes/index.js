const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const blogHandler = require('../handlers/blogHandler');
const commentHandler = require('../handlers/commentHandler');
const likeHandler = require('../handlers/likeHandler');

router.get('/blogs', auth, blogHandler.getAllBlogs);
router.post('/blogs', auth, blogHandler.createBlog);
router.get('/blogs/:id', auth, blogHandler.getBlog);

router.post('/blogs/:id/comments', auth, commentHandler.addComment);
router.put('/blogs/:id/comments/:commentId', auth, commentHandler.editComment);

router.post('/blogs/:id/like', auth, likeHandler.likeBlog);
router.delete('/blogs/:id/like', auth, likeHandler.unlikeBlog);

module.exports = router;
