import { blogClient, authHeader } from './httpClient';

export async function createBlog(token, payload) {
  const { data } = await blogClient.post('/', payload, { headers: authHeader(token) });
  return data;
}

export async function fetchBlogs(token) {
  const { data } = await blogClient.get('/', { headers: authHeader(token) });
  return data;
}

export async function likeBlog(token, id) {
  const { data } = await blogClient.post(`/${id}/like`, {}, { headers: authHeader(token) });
  return data;
}

export async function unlikeBlog(token, id) {
  const { data } = await blogClient.delete(`/${id}/like`, { headers: authHeader(token) });
  return data;
}

export async function fetchComments(token, blogId) {
  const { data } = await blogClient.get(`/${blogId}/comments`, { headers: authHeader(token) });
  return data;
}

export async function createComment(token, blogId, text) {
  const { data } = await blogClient.post(`/${blogId}/comments`, { text }, { headers: authHeader(token) });
  return data;
}

export async function updateComment(token, blogId, commentId, text) {
  const { data } = await blogClient.put(
    `/${blogId}/comments/${commentId}`,
    { text },
    { headers: authHeader(token) },
  );
  return data;
}
