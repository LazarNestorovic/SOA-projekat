import { stakeholderClient, authHeader } from './httpClient';

export async function getUsers(token) {
  const { data } = await stakeholderClient.get('/users', { headers: authHeader(token) });
  return data;
}

export async function blockUser(token, id) {
  const { data } = await stakeholderClient.put(`/users/${id}/block`, {}, { headers: authHeader(token) });
  return data;
}

export async function getProfile(token) {
  const { data } = await stakeholderClient.get('/profile', { headers: authHeader(token) });
  return data;
}

export async function updateProfile(token, payload) {
  const { data } = await stakeholderClient.put('/profile/update', payload, { headers: authHeader(token) });
  return data;
}
