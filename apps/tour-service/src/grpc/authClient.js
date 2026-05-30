/**
 * gRPC klijent prema auth-service.
 * Koristi se umesto HTTP poziva za validaciju tokena.
 */

'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '../../proto/auth/auth.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDef).auth;

let _client = null;

function getClient() {
	if (!_client) {
		const addr = process.env.AUTH_SERVICE_GRPC_URL || 'auth-service:9091';
		_client = new authProto.AuthService(
			addr,
			grpc.credentials.createInsecure(),
		);
	}
	return _client;
}

function validateToken(token) {
	return new Promise((resolve, reject) => {
		getClient().ValidateToken({ token }, (err, resp) => {
			if (err) return reject(err);
			resolve(resp);
		});
	});
}

module.exports = { validateToken };
