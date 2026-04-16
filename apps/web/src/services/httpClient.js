import axios from 'axios';
import appConfig from '../config/appConfig';

export const stakeholderClient = axios.create({
  baseURL: appConfig.api.stakeholderBaseUrl,
});

export const blogClient = axios.create({
  baseURL: appConfig.api.blogBaseUrl,
});

export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
