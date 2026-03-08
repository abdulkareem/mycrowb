import axios from 'axios';

const defaultApiUrl = import.meta.env.PROD
  ? 'https://mycrowb-production.up.railway.app/api/v1'
  : 'http://localhost:8080/api/v1';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default client;
