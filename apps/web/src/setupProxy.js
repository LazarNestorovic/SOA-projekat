const { createProxyMiddleware } = require('http-proxy-middleware');
const appConfig = require('./config/appConfig');

module.exports = function setupProxy(app) {
  app.use(
    '/stakeholder',
    createProxyMiddleware({
      target: appConfig.proxy.stakeholder.target,
      changeOrigin: true,
      pathRewrite: { '^/stakeholder': '' },
    }),
  );

  app.use(
    '/blog',
    createProxyMiddleware({
      target: appConfig.proxy.blog.target,
      changeOrigin: true,
      pathRewrite: { '^/blog': '' },
    }),
  );
};
