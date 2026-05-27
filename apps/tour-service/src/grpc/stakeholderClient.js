/**
 * gRPC klijent prema stakeholder-service.
 * Koristi se umesto HTTP axios poziva za DeductBalance operaciju.
 *
 * Proto fajl: /proto/stakeholder/stakeholder.proto
 * Servis sluša na: stakeholder-service:9092
 */

'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '../../proto/stakeholder/stakeholder.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const stakeholderProto = grpc.loadPackageDefinition(packageDef).stakeholder;

// Singleton konekcija — kreira se jednom pri prvom zahtevu
let _client = null;

function getClient() {
  if (!_client) {
    const addr = process.env.STAKEHOLDER_GRPC_URL || 'stakeholder-service:9092';
    _client = new stakeholderProto.StakeholderService(
      addr,
      grpc.credentials.createInsecure()
    );
  }
  return _client;
}

/**
 * deductBalance — skida amount sa balansa korisnika userId.
 * @param {number} userId
 * @param {number} amount
 * @returns {Promise<{ new_balance: number }>}
 */
function deductBalance(userId, amount) {
  return new Promise((resolve, reject) => {
    getClient().DeductBalance({ user_id: userId, amount }, (err, response) => {
      if (err) {
        // grpc status FAILED_PRECONDITION (9) → nedovoljan balans (HTTP 402)
        if (err.code === grpc.status.FAILED_PRECONDITION) {
          const e = new Error('Nedovoljan balans za kupovinu');
          e.grpcCode = grpc.status.FAILED_PRECONDITION;
          return reject(e);
        }
        return reject(err);
      }
      resolve(response);
    });
  });
}

module.exports = { deductBalance };
