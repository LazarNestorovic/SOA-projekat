'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {
	createTourRecord,
	updateTourStatusRecord,
	toTourDto,
} = require('../controllers/tourController');
const { pool } = require('../config/database');

const PROTO_PATH = path.join(__dirname, '../../proto/tour/tour.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});

const tourProto = grpc.loadPackageDefinition(packageDef).tour;

function mapGrpcError(error) {
	if (error.statusCode === 400) {
		return grpc.status.INVALID_ARGUMENT;
	}
	if (error.statusCode === 403) {
		return grpc.status.PERMISSION_DENIED;
	}
	if (error.statusCode === 404) {
		return grpc.status.NOT_FOUND;
	}
	return grpc.status.INTERNAL;
}

function startGrpcServer() {
	const server = new grpc.Server();

	server.addService(tourProto.TourService.service, {
		CreateTour: async (call, callback) => {
			try {
				const tour = await createTourRecord({
					userId: call.request.user_id,
					title: call.request.title,
					description: call.request.description,
					difficulty: call.request.difficulty,
					tags: call.request.tags || [],
					price: call.request.price,
					transportTimes: call.request.transport_times || {},
				});
				callback(null, toTourDto(tour));
			} catch (error) {
				callback({
					code: mapGrpcError(error),
					message: error.message || 'Greška pri kreiranju ture',
				});
			}
		},
		UpdateTourStatus: async (call, callback) => {
			try {
				const tour = await updateTourStatusRecord({
					id: call.request.id,
					userId: call.request.user_id,
					role: call.request.role,
					status: call.request.status,
				});
				callback(null, toTourDto(tour));
			} catch (error) {
				callback({
					code: mapGrpcError(error),
					message: error.message || 'Greška pri promeni statusa',
				});
			}
		},
		GetTour: async (call, callback) => {
			try {
				const result = await pool.query('SELECT * FROM tours WHERE id = $1', [call.request.id]);
				if (result.rows.length === 0) {
					return callback({ code: grpc.status.NOT_FOUND, message: 'Tura nije pronađena' });
				}
				callback(null, toTourDto(result.rows[0]));
			} catch (error) {
				callback({ code: grpc.status.INTERNAL, message: error.message || 'Greška pri dohvatanju ture' });
			}
		},
		GetPublishedTours: async (call, callback) => {
			try {
				const userId = call.request.user_id;
				const result = await pool.query(
					`SELECT
						t.id, t.user_id, t.title, t.description, t.difficulty, t.tags,
						t.status, t.price, t.distance_km, t.transport_times,
						t.published_at, t.archived_at, t.created_at,
						EXISTS(
							SELECT 1 FROM tour_purchase_tokens tpt
							WHERE tpt.tourist_id = $1 AND tpt.tour_id = t.id
						) AS is_purchased,
						EXISTS(
							SELECT 1 FROM order_items oi
							JOIN shopping_carts sc ON sc.id = oi.cart_id
							WHERE sc.tourist_id = $1 AND oi.tour_id = t.id
						) AS in_cart
					FROM tours t
					WHERE t.status = 'published'
					ORDER BY t.created_at DESC`,
					[userId],
				);
				callback(null, {
					tours: result.rows.map((row) => ({
						...toTourDto(row),
						is_purchased: row.is_purchased,
						in_cart: row.in_cart,
					})),
				});
			} catch (error) {
				callback({ code: grpc.status.INTERNAL, message: error.message || 'Greška pri dohvatanju tura' });
			}
		},
	});

	const port = process.env.GRPC_PORT || '9095';
	server.bindAsync(
		`0.0.0.0:${port}`,
		grpc.ServerCredentials.createInsecure(),
		(err, boundPort) => {
			if (err) {
				console.error('Tour gRPC server nije pokrenut:', err);
				return;
			}
			server.start();
			console.log(`Tour gRPC server pokrenut na portu ${boundPort}`);
		},
	);
}

module.exports = { startGrpcServer };
