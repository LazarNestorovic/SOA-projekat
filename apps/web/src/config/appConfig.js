/**
 * Single source of truth for the web app configuration.
 * - `api.*BaseUrl` is used by axios clients (browser code)
 * - `proxy.*.target` is used by CRA dev proxy (Node runtime in setupProxy.js)
 */

const appConfig = {
  api: {
    stakeholderBaseUrl: process.env.REACT_APP_STAKEHOLDER_URL || '/stakeholder',
    blogBaseUrl: process.env.REACT_APP_BLOG_URL || '/blog',
  },
  proxy: {
    stakeholder: {
      target: process.env.REACT_APP_STAKEHOLDER_TARGET || 'http://localhost:8082',
    },
    blog: {
      target: process.env.REACT_APP_BLOG_TARGET || 'http://localhost:8083',
    },
  },
};

module.exports = appConfig;
