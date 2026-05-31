import axios from 'axios';
import appConfig from '../config/appConfig';

export const stakeholderClient = axios.create({
  baseURL: appConfig.api.stakeholderBaseUrl,
});

export const blogClient = axios.create({
  baseURL: appConfig.api.blogBaseUrl,
});

export const followerClient = axios.create({
  baseURL: appConfig.api.followerBaseUrl,
});

export const tourClient = axios.create({
  baseURL: appConfig.api.tourBaseUrl,
});

export const sagaClient = axios.create({
  baseURL: `${appConfig.proxy.gatewayTarget}/api/sagas`,
});

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}