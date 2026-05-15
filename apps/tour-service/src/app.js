const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./config/database');
const { authenticate } = require('./middleware/auth');
const tourController = require('./controllers/tourController');

const app = express();

// OVO OBRISATI DA SE NE DUPLIRA SA API GATEWAY CORSOM
// app.use(cors());
app.use(express.json());

// Pokretanje migracija baze pri podizanju
runMigrations();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'tour-service' });
});

app.post('/api/tours', authenticate, tourController.createTour);
app.get('/api/tours/my', authenticate, tourController.getMyTours);
app.get('/api/tours/all', authenticate, tourController.getAllTours);
app.post('/api/tours/:id/key-points', authenticate, tourController.addKeyPoint);
app.post('/api/tours/:id/reviews', authenticate, tourController.createReview);
app.get('/api/tours/:id/reviews', authenticate, tourController.getReviews);

const PORT = process.env.SERVER_PORT || 8085;
app.listen(PORT, () => {
  console.log(`Tour service (Node) pokrenut na portu ${PORT}`);
});
