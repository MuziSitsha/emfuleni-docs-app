import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const isLocalDev =
  isBrowser &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (isLocalDev ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
