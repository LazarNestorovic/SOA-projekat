'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {
	createTourRecord,
	updateTourStatusRecord,
	toTourDto,
} = require('../controllers/tourController');

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
