const appConfig = {
  api: {
    stakeholderBaseUrl: 'http://localhost:8080/api/stakeholders',
    blogBaseUrl: 'http://localhost:8080/api/blogs',
    followerBaseUrl: 'http://localhost:8080/api/followers',
  },
  proxy: {
    gatewayTarget: process.env.REACT_APP_GATEWAY_TARGET || 'http://localhost:8080',
  },
};

module.exports = appConfig;
