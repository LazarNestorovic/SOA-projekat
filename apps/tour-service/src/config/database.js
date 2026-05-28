const { Pool } = require('pg');

const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5432'),
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || 'root',
	database: process.env.DB_NAME || 'tours_db',
});

async function runMigrations() {
	const client = await pool.connect();
	try {
		await client.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        price NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tour_key_points (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tour_reviews (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
        tourist_id INTEGER NOT NULL,
        tourist_name VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '',
        visit_date DATE NOT NULL,
        images TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tourist_current_positions (
        id SERIAL PRIMARY KEY,
        tourist_id INTEGER NOT NULL UNIQUE,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shopping_carts (
        id SERIAL PRIMARY KEY,
        tourist_id INTEGER NOT NULL UNIQUE,
        total_price NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        cart_id INTEGER REFERENCES shopping_carts(id) ON DELETE CASCADE,
        tour_id INTEGER NOT NULL,
        tour_name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cart_id, tour_id)
      );

      CREATE TABLE IF NOT EXISTS tour_purchase_tokens (
        id SERIAL PRIMARY KEY,
        tourist_id INTEGER NOT NULL,
        tour_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tourist_id, tour_id)
      );

      CREATE TABLE IF NOT EXISTS tour_purchases (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
        tourist_id INTEGER NOT NULL,
        price NUMERIC DEFAULT 0,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tour_id, tourist_id)
      );

      CREATE TABLE IF NOT EXISTS tour_executions (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
        tourist_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_key_points JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS tour_bookings (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id),
        user_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        price NUMERIC(10, 2) NOT NULL,
        saga_correlation_id UUID DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
		console.log('Tour migracije uspesno pokrenute!');
	} catch (error) {
		console.error('Greska pri migraciji tours baze:', error);
	} finally {
		client.release();
	}
}

module.exports = { pool, runMigrations };
