require('dotenv').config();
const express = require('express');
const routes = require('./src/routes');

const app = express();
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
	console.log(`Blog service started on port: ${PORT}`);
});
