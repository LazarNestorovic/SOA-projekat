const { createProxyMiddleware } = require('http-proxy-middleware');
const appConfig = require('./config/appConfig');

module.exports = function setupProxy(app) {
  const gatewayTarget =
    (appConfig.proxy && appConfig.proxy.gatewayTarget) ||
    process.env.REACT_APP_GATEWAY_TARGET ||
    'http://localhost:8080';

  app.use(
    '/api',
    createProxyMiddleware({
      target: gatewayTarget,
      changeOrigin: true,
    }),
  );
};