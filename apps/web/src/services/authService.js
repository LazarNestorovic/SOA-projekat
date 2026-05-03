import { stakeholderClient, authHeader } from './httpClient';

export async function register(payload) {
  const { data } = await stakeholderClient.post('/auth/register', payload);
  return data;
}

export async function login(payload) {
  const { data } = await stakeholderClient.post('/auth/login', payload);
  return data;
}

export async function getMe(token) {
  const { data } = await stakeholderClient.get('/me', { headers: authHeader(token) });
  return data;
}
