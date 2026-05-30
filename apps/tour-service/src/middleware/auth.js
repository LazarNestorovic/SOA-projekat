const { validateToken } = require('../grpc/authClient');

const authenticate = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ error: 'Nedostaje ili nevalidan Authorization header' });
	}

	const token = authHeader.split(' ')[1];

	try {
		const resp = await validateToken(token);
		req.user = {
			user_id: resp.user_id,
			username: resp.username,
			email: resp.email,
			role: resp.role,
		};
		next();
	} catch (error) {
		console.error('Auth greška (gRPC):', error.message || error);
		res.status(401).json({ error: 'Nevažeći token' });
	}
};

module.exports = { authenticate };
