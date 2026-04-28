import React, { useMemo, useState } from 'react';
import { createBlog } from '../../services/blogService';
import { markdownToHtml } from '../../utils/markdown';

const emptyForm = {
  title: '',
  description: '',
  images: '',
};

function BlogEditorPanel({ token, onCreated, onNotice, onError }) {
  const [blogForm, setBlogForm] = useState(emptyForm);

  const parsedImages = useMemo(() => {
    return blogForm.images
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }, [blogForm.images]);

  const markdownPreview = useMemo(() => markdownToHtml(blogForm.description), [blogForm.description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBlog(token, {
        title: blogForm.title,
        description: blogForm.description,
        images: parsedImages,
      });
      setBlogForm(emptyForm);
      onNotice('Blog published.', 'success');
      if (onCreated) onCreated();
    } catch (error) {
      onError(error);
    }
  };

  return (
    <section className="card panel">
      <h2>Create Blog</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Title" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} />
        <textarea
          placeholder="Description (Markdown)"
          value={blogForm.description}
          onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })}
        />
        <input
          placeholder="Image URLs separated by commas"
          value={blogForm.images}
          onChange={(e) => setBlogForm({ ...blogForm, images: e.target.value })}
        />
        <button type="submit">Publish Blog</button>
      </form>

      <div className="preview">
        <h3>Markdown Preview</h3>
        <div className="markdown" dangerouslySetInnerHTML={{ __html: markdownPreview || '<p>Markdown preview will appear here.</p>' }} />
      </div>
    </section>
  );
}

export default BlogEditorPanel;
