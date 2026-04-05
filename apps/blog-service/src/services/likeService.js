const likeRepo = require('../repositories/likeRepository');
const blogRepo = require('../repositories/blogRepository');

async function likeBlog(blogId, userId) {
	const blog = await blogRepo.getBlogById(blogId);
	if (!blog) throw { status: 404, message: 'Blog not found' };

	const existing = await likeRepo.getLike(blogId, userId);
	if (existing) throw { status: 409, message: 'Blog already liked' };

	return likeRepo.addLike(blogId, userId);
}

async function unlikeBlog(blogId, userId) {
	const blog = await blogRepo.getBlogById(blogId);
	if (!blog) throw { status: 404, message: 'Blog not found' };

	const removed = await likeRepo.removeLike(blogId, userId);
	if (!removed) throw { status: 404, message: 'Blog not liked' };

	return removed;
}

module.exports = { likeBlog, unlikeBlog };
