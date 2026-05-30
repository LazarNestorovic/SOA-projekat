'use strict';

const { validateToken } = require('../grpc/authClient');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Nedostaje Authorization header' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Nevazeci Authorization header format' });
  }

  try {
    const claims = await validateToken(token);
    req.user = {
      user_id: claims.user_id,
      username: claims.username,
      email: claims.email,
      role: claims.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Nevazeci token' });
  }
}

module.exports = authMiddleware;
