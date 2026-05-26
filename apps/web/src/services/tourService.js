import { tourClient, authHeader } from './httpClient';

export async function createTour(token, payload) {
	const { data } = await tourClient.post('/', payload, {
		headers: authHeader(token),
	});
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
	const { data } = await tourClient.post(`/${tourId}/key-points`, payload, {
		headers: authHeader(token),
	});
	return data;
}

export async function updateKeyPoint(token, keyPointId, payload) {
	const { data } = await tourClient.put(`/key-points/${keyPointId}`, payload, {
		headers: authHeader(token),
	});
	return data;
}

export async function deleteKeyPoint(token, keyPointId) {
	await tourClient.delete(`/key-points/${keyPointId}`, {
		headers: authHeader(token),
	});
}

export async function createReview(token, tourId, payload) {
	const { data } = await tourClient.post(`/${tourId}/reviews`, payload, {
		headers: authHeader(token),
	});
	return data;
}

export async function getReviews(token, tourId) {
	const { data } = await tourClient.get(`/${tourId}/reviews`, {
		headers: authHeader(token),
	});
	return data;
}

export async function getCurrentPosition(token) {
	const { data } = await tourClient.get('/current-position', {
		headers: authHeader(token),
	});
	return data;
}

export async function updateCurrentPosition(token, payload) {
	const { data } = await tourClient.put('/current-position', payload, {
		headers: authHeader(token),
	});
	return data;
}

export async function updateTourStatus(token, tourId, status) {
	const { data } = await tourClient.patch(`/${tourId}/status`, { status }, { headers: authHeader(token) });
	return data;
}

export async function getPublishedTours(token) {
	const { data } = await tourClient.get('/published', { headers: authHeader(token) });
	return data;
}

export async function getPurchasedTours(token) {
	const { data } = await tourClient.get('/purchased', { headers: authHeader(token) });
	return data;
}

export async function getCart(token) {
	const { data } = await tourClient.get('/cart', { headers: authHeader(token) });
	return data;
}

export async function addToCart(token, tourId) {
	const { data } = await tourClient.post(`/cart/add/${tourId}`, {}, { headers: authHeader(token) });
	return data;
}

export async function removeFromCart(token, tourId) {
	const { data } = await tourClient.delete(`/cart/remove/${tourId}`, { headers: authHeader(token) });
	return data;
}

export async function checkout(token) {
	const { data } = await tourClient.post('/cart/checkout', {}, { headers: authHeader(token) });
	return data;
}
