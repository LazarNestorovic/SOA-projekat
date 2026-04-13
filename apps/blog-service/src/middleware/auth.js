const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8081';

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Nedostaje Authorization header' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Nevažeći Authorization header format' });
  }

  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/token/validate`, { token });
    req.user = response.data;
    next();
  } catch {
    return res.status(401).json({ error: 'Nevažeći token' });
  }
}

module.exports = authMiddleware;
