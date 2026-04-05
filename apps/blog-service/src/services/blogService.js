const blogRepo = require('../repositories/blogRepository');
const commentRepo = require('../repositories/commentRepository');

async function createBlog(userId, { title, description, imageUrls }) {
	if (!title || !description) {
		throw { status: 400, message: 'Title and description are required' };
	}
	return blogRepo.createBlog({ userId, title, description, imageUrls });
}

async function getBlog(id) {
	const blog = await blogRepo.getBlogById(id);
	if (!blog) throw { status: 404, message: 'Blog not found' };

	const comments = await commentRepo.getCommentsByBlogId(id);
	return { ...blog, comments };
}

async function getAllBlogs() {
	return blogRepo.getAllBlogs();
}

module.exports = { createBlog, getBlog, getAllBlogs };
