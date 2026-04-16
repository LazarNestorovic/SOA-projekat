import React, { useCallback, useEffect, useState } from 'react';
import {
  createComment,
  fetchBlogs,
  fetchComments,
  likeBlog,
  unlikeBlog,
  updateComment,
} from '../../services/blogService';
import { formatDate } from '../../utils/date';
import { markdownToHtml } from '../../utils/markdown';

function BlogFeedPanel({ token, user, active, onNotice, onError }) {
  const [blogs, setBlogs] = useState([]);
  const [commentsByBlog, setCommentsByBlog] = useState({});
  const [commentText, setCommentText] = useState({});
  const [commentEditText, setCommentEditText] = useState({});
  const [editingCommentId, setEditingCommentId] = useState({});

  const loadBlogs = useCallback(async () => {
    try {
      const data = await fetchBlogs(token);
      setBlogs(data || []);
    } catch (error) {
      onError(error);
    }
  }, [token, onError]);

  const loadCommentsForBlog = useCallback(async (blogId) => {
    const data = await fetchComments(token, blogId);
    setCommentsByBlog((prev) => ({
      ...prev,
      [blogId]: Array.isArray(data) ? data : [],
    }));
  }, [token]);

  useEffect(() => {
    if (!active) return;

    loadBlogs();

    const intervalId = window.setInterval(() => {
      loadBlogs();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, loadBlogs]);

  useEffect(() => {
    if (!active || blogs.length === 0) return;

    let cancelled = false;

    const loadAllComments = async () => {
      const results = await Promise.all(
        blogs.map(async (blog) => {
          try {
            const data = await fetchComments(token, blog.id);
            return [blog.id, Array.isArray(data) ? data : []];
          } catch {
            return [blog.id, []];
          }
        }),
      );

      if (cancelled) return;

      setCommentsByBlog((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    };

    loadAllComments();

    return () => {
      cancelled = true;
    };
  }, [active, blogs, token]);

  const handleLike = async (blogId) => {
    try {
      await likeBlog(token, blogId);
      await loadBlogs();
    } catch (error) {
      onError(error);
    }
  };

  const handleUnlike = async (blogId) => {
    try {
      await unlikeBlog(token, blogId);
      await loadBlogs();
    } catch (error) {
      onError(error);
    }
  };

  const handleCreateComment = async (blogId) => {
    try {
      const text = (commentText[blogId] || '').trim();
      if (!text) {
        onNotice('Comment text is required.', 'error');
        return;
      }

      await createComment(token, blogId, text);
      setCommentText((prev) => ({ ...prev, [blogId]: '' }));
      await loadCommentsForBlog(blogId);
      onNotice('Comment added.', 'success');
    } catch (error) {
      onError(error);
    }
  };

  const startEditComment = (blogId, commentId, text) => {
    setEditingCommentId((prev) => ({ ...prev, [blogId]: commentId }));
    setCommentEditText((prev) => ({ ...prev, [commentId]: text }));
  };

  const cancelEditComment = (blogId) => {
    setEditingCommentId((prev) => ({ ...prev, [blogId]: null }));
  };

  const handleEditComment = async (blogId, commentId) => {
    try {
      const text = (commentEditText[commentId] || '').trim();
      if (!text) {
        onNotice('Comment text is required.', 'error');
        return;
      }

      await updateComment(token, blogId, commentId, text);
      cancelEditComment(blogId);
      await loadCommentsForBlog(blogId);
      onNotice('Comment updated.', 'success');
    } catch (error) {
      onError(error);
    }
  };

  return (
    <section className="card panel">
      <div className="panel-head">
        <h2>Blog Feed</h2>
      </div>

      <div className="feed">
        {blogs.map((blogItem) => (
          <article className="blog" key={blogItem.id}>
            <div className="blog-head">
              <h3>{blogItem.title}</h3>
              <p className="meta">
                By: {blogItem.username} | Created: {formatDate(blogItem.created_at)}
              </p>
            </div>

            <div className="markdown" dangerouslySetInnerHTML={{ __html: markdownToHtml(blogItem.description) }} />

            {Array.isArray(blogItem.images) && blogItem.images.length > 0 ? (
              <div className="images-grid">
                {blogItem.images.map((img) => (
                  <a href={img} key={img} target="_blank" rel="noreferrer" className="image-chip">
                    {img}
                  </a>
                ))}
              </div>
            ) : null}

            <div className="actions-row">
              <span>
                Likes: <strong>{blogItem.likes_count}</strong>
              </span>
              <button type="button" onClick={() => handleLike(blogItem.id)}>Like</button>
              <button type="button" className="ghost" onClick={() => handleUnlike(blogItem.id)}>Unlike</button>
            </div>

            <div className="comments">
              <h4>Comments</h4>

              {(commentsByBlog[blogItem.id] || []).map((comment) => {
                const isOwn = comment.user_id === user?.id;
                const isEditing = editingCommentId[blogItem.id] === comment.id;

                return (
                  <div className="comment-card" key={comment.id}>
                    <p className="meta">
                      <strong>{comment.username}</strong>
                      {' | '} Created: {formatDate(comment.created_at)}
                      {' | '} Updated: {formatDate(comment.updated_at)}
                    </p>

                    {isEditing ? (
                      <>
                        <textarea
                          value={commentEditText[comment.id] || ''}
                          onChange={(e) => setCommentEditText((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                        />
                        <div className="actions-row">
                          <button type="button" onClick={() => handleEditComment(blogItem.id, comment.id)}>
                            Save Comment
                          </button>
                          <button type="button" className="ghost" onClick={() => cancelEditComment(blogItem.id)}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>{comment.text}</p>
                    )}

                    {isOwn && !isEditing ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => startEditComment(blogItem.id, comment.id, comment.text)}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                );
              })}

              <textarea
                placeholder="New comment"
                value={commentText[blogItem.id] || ''}
                onChange={(e) => setCommentText((prev) => ({ ...prev, [blogItem.id]: e.target.value }))}
              />
              <button type="button" onClick={() => handleCreateComment(blogItem.id)}>Add Comment</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BlogFeedPanel;
