const commentRepo = require('../repositories/commentRepository');
const blogRepo = require('../repositories/blogRepository');

async function addComment(blogId, userId, username, text) {
	const blog = await blogRepo.getBlogById(blogId);
	if (!blog) throw { status: 404, message: 'Blog not found' };

	if (!text || text.trim() === '') {
		throw { status: 400, message: 'Comment cannot be empty' };
	}

	return commentRepo.createComment({ blogId, userId, username, text });
}

async function editComment(commentId, userId, text) {
	const comment = await commentRepo.getCommentById(commentId);
	if (!comment) throw { status: 404, message: 'Comment not found' };

	if (comment.user_id !== userId) {
		throw { status: 403, message: 'No permission to edit comment' };
	}

	if (!text || text.trim() === '') {
		throw { status: 400, message: 'Comment cannot be empty' };
	}

	return commentRepo.updateComment(commentId, text);
}

module.exports = { addComment, editComment };
