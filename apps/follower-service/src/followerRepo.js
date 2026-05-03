const { session } = require('./neo4j');

async function ensureUserNode(userId) {
  const neo4jSession = session();
  try {
    await neo4jSession.run('MERGE (:User {id: $id})', { id: Number(userId) });
  } finally {
    await neo4jSession.close();
  }
}

async function follow(followerId, followedId) {
  if (Number(followerId) === Number(followedId)) {
    return { created: false, reason: 'self_follow_not_allowed' };
  }

  const neo4jSession = session();
  try {
    const result = await neo4jSession.run(
      `MERGE (a:User {id: $followerId})
       MERGE (b:User {id: $followedId})
       MERGE (a)-[r:FOLLOWS]->(b)
       RETURN true AS ok`,
      { followerId: Number(followerId), followedId: Number(followedId) },
    );

    return { created: Boolean(result.records[0]?.get('ok')) };
  } finally {
    await neo4jSession.close();
  }
}

async function unfollow(followerId, followedId) {
  const neo4jSession = session();
  try {
    const result = await neo4jSession.run(
      `MATCH (a:User {id: $followerId})-[r:FOLLOWS]->(b:User {id: $followedId})
       DELETE r
       RETURN count(r) AS deleted`,
      { followerId: Number(followerId), followedId: Number(followedId) },
    );

    const deleted = Number(result.records[0]?.get('deleted') || 0);
    return { deleted };
  } finally {
    await neo4jSession.close();
  }
}

async function listFollowing(userId) {
  const neo4jSession = session();
  try {
    const result = await neo4jSession.run(
      `MATCH (:User {id: $id})-[:FOLLOWS]->(u:User)
       RETURN u.id AS id
       ORDER BY id ASC`,
      { id: Number(userId) },
    );

    return result.records.map((r) => Number(r.get('id')));
  } finally {
    await neo4jSession.close();
  }
}

async function recommend(userId, limit = 10) {
  const safeLimitRaw = Number.parseInt(String(limit), 10);
  const safeLimit = Number.isFinite(safeLimitRaw) && safeLimitRaw >= 0 ? safeLimitRaw : 10;

  const neo4jSession = session();
  try {
    const result = await neo4jSession.run(
      `MATCH (me:User {id: $me})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(rec:User)
       WHERE NOT (me)-[:FOLLOWS]->(rec) AND rec.id <> $me
       RETURN rec.id AS id, count(*) AS score
       ORDER BY score DESC, id ASC
       LIMIT toInteger($limit)`,
      { me: Number(userId), limit: safeLimit },
    );

    return result.records.map((r) => ({
      id: Number(r.get('id')),
      score: Number(r.get('score')),
    }));
  } finally {
    await neo4jSession.close();
  }
}

module.exports = { ensureUserNode, follow, unfollow, listFollowing, recommend };
