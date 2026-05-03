import { followerClient, authHeader } from './httpClient';

export async function followUser(token, targetUserId) {
  const { data } = await followerClient.post(
    `/follow/${targetUserId}`,
    {},
    { headers: authHeader(token) },
  );
  return data;
}

export async function unfollowUser(token, targetUserId) {
  const { data } = await followerClient.delete(`/follow/${targetUserId}`, {
    headers: authHeader(token),
  });
  return data;
}

export async function getFollowing(token) {
  const { data } = await followerClient.get('/following', {
    headers: authHeader(token) },
  );
  return data;
}

export async function getRecommendations(token, limit = 10) {
  const { data } = await followerClient.get(`/recommendations?limit=${limit}`, {
    headers: authHeader(token) },
  );
  return data;
}
