import { tourClient, authHeader } from './httpClient';

export async function createTour(token, payload) {
  const { data } = await tourClient.post('/', payload, { headers: authHeader(token) });
  return data;
}

export async function getMyTours(token) {
  const { data } = await tourClient.get('/my', { headers: authHeader(token) });
  return data;
}

export async function getAllTours(token) {
  const { data } = await tourClient.get('/all', { headers: authHeader(token) });
  return data;
}

export async function addKeyPointToTour(token, tourId, payload) {
  const { data } = await tourClient.post(`/${tourId}/key-points`, payload, { headers: authHeader(token) });
  return data;
}

export async function createReview(token, tourId, payload) {
  const { data } = await tourClient.post(`/${tourId}/reviews`, payload, { headers: authHeader(token) });
  return data;
}

export async function getReviews(token, tourId) {
  const { data } = await tourClient.get(`/${tourId}/reviews`, { headers: authHeader(token) });
  return data;
}
