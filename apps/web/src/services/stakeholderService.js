import { stakeholderClient, authHeader } from './httpClient';

export async function getUsers(token) {
  const { data } = await stakeholderClient.get('/api/users', { headers: authHeader(token) });
  return data;
}

export async function blockUser(token, id) {
  const { data } = await stakeholderClient.put(`/api/users/${id}/block`, {}, { headers: authHeader(token) });
  return data;
}

export async function getProfile(token) {
  const { data } = await stakeholderClient.get('/api/profile', { headers: authHeader(token) });
  return data;
}

export async function updateProfile(token, payload) {
  const { data } = await stakeholderClient.put('/api/profile/update', payload, { headers: authHeader(token) });
  return data;
}
