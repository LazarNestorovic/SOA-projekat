const client = require('prom-client');

// collect default metrics (process, cpu, memory)
client.collectDefaultMetrics({ prefix: 'tour_service_' });

const httpRequestDurationSeconds = new client.Histogram({
	name: 'tour_service_http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status'],
	buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1.5, 10],
});

const httpRequestsTotal = new client.Counter({
	name: 'tour_service_http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status'],
});

function metricsMiddleware(req, res, next) {
	const route = req.route && req.route.path ? req.route.path : req.path;
	const end = httpRequestDurationSeconds.startTimer();
	res.on('finish', () => {
		httpRequestsTotal.inc({
			method: req.method,
			route,
			status: res.statusCode,
		});
		end({ method: req.method, route, status: res.statusCode });
	});
	next();
}

module.exports = {
	metricsMiddleware,
	register: client.register,
};
