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

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}