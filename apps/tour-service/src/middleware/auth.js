const axios = require('axios');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8081';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nedostaje ili nevalidan Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.post(`${authServiceUrl}/token/validate`, { token });
    req.user = response.data; // { user_id, username, email, role }
    next();
  } catch (error) {
    console.error('Auth greška:', error.response?.data || error.message);
    res.status(401).json({ error: 'Nevažeći token' });
  }
};

module.exports = { authenticate };
