const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./config/database');
const { authenticate } = require('./middleware/auth');
const tourController = require('./controllers/tourController');
const cartController = require('./controllers/cartController');
const tourExecutionController = require('./controllers/tourExecutionController');

const app = express();

// OVO OBRISATI DA SE NE DUPLIRA SA API GATEWAY CORSOM
// app.use(cors());
app.use(express.json());

// Pokretanje migracija baze pri podizanju
runMigrations();

app.get('/health', (req, res) => {
	res.status(200).json({ status: 'healthy', service: 'tour-service' });
});

// Ture za vodiče/admin
app.post('/api/tours', authenticate, tourController.createTour);
app.patch('/api/tours/:id/status', authenticate, tourController.updateTourStatus);
app.get('/api/tours/my', authenticate, tourController.getMyTours);
app.get('/api/tours/all', authenticate, tourController.getAllTours);
app.post('/api/tours/:id/key-points', authenticate, tourController.addKeyPoint);
app.put(
	'/api/tours/key-points/:keyPointId',
	authenticate,
	tourController.updateKeyPoint,
);
app.delete(
	'/api/tours/key-points/:keyPointId',
	authenticate,
	tourController.deleteKeyPoint,
);
app.post('/api/tours/:id/reviews', authenticate, tourController.createReview);
app.get('/api/tours/:id/reviews', authenticate, tourController.getReviews);
app.get(
	'/api/tours/current-position',
	authenticate,
	tourController.getCurrentPosition,
);
app.put(
	'/api/tours/current-position',
	authenticate,
	tourController.upsertCurrentPosition,
);

// Browsing i kupovina tura (turisti)
app.get('/api/tours/published', authenticate, cartController.getPublishedTours);
app.get('/api/tours/purchased', authenticate, cartController.getPurchasedTours);

// Korpa
app.get('/api/tours/cart', authenticate, cartController.getCart);
app.post('/api/tours/cart/add/:tourId', authenticate, cartController.addToCart);
app.delete('/api/tours/cart/remove/:tourId', authenticate, cartController.removeFromCart);
app.post('/api/tours/cart/checkout', authenticate, cartController.checkout);

// Executions
app.post("/api/tours/:id/purchase", authenticate, tourExecutionController.purchaseTour);
app.post("/api/tours/:id/executions", authenticate, tourExecutionController.startTour);
app.put("/api/tours/executions/:executionId/status", authenticate, tourExecutionController.checkStatus);
app.put("/api/tours/executions/:executionId/complete", authenticate, tourExecutionController.completeTour);
app.put("/api/tours/executions/:executionId/abandon", authenticate, tourExecutionController.abandonTour);

// Bookings
app.post('/api/tours/:tourId/bookings', authenticate, tourController.createBooking);
app.patch('/api/tours/bookings/:bookingId/status', authenticate, tourController.updateBookingStatus);

const PORT = process.env.SERVER_PORT || 8085;
app.listen(PORT, () => {
	console.log(`Tour service (Node) pokrenut na portu ${PORT}`);
});
