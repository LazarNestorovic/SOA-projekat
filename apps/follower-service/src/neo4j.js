const neo4j = require('neo4j-driver');

function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const NEO4J_URI = requireEnv('NEO4J_URI', 'bolt://localhost:7687');
const NEO4J_USER = requireEnv('NEO4J_USER', 'neo4j');
const NEO4J_PASSWORD = requireEnv('NEO4J_PASSWORD', 'password');

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  { disableLosslessIntegers: true },
);

async function verifyNeo4j() {
  await driver.verifyConnectivity();
}

function session() {
  return driver.session({ defaultAccessMode: neo4j.session.WRITE });
}

async function close() {
  await driver.close();
}

module.exports = { driver, session, verifyNeo4j, close };
