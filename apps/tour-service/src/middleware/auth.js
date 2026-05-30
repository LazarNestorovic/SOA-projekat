const { validateToken } = require('../grpc/authClient');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nedostaje ili nevalidan Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const claims = await validateToken(token);
    req.user = {
      user_id: claims.user_id,
      username: claims.username,
      email: claims.email,
      role: claims.role,
    };
    next();
  } catch (error) {
    console.error('Auth gRPC greška:', error.message);
    res.status(401).json({ error: 'Nevažeći token' });
  }
};

module.exports = { authenticate };
