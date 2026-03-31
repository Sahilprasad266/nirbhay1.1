import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getHeatmap = async () => {
  const response = await api.get('/heatmap');
  return response.data;
};

export const findSafeRoute = async (sourceLat, sourceLng, destLat, destLng, mode = 'safest') => {
  const response = await api.post('/route/safe', {
    source_lat: sourceLat,
    source_lng: sourceLng,
    dest_lat: destLat,
    dest_lng: destLng,
    mode: mode,
  });
  return response.data;
};

export const getDistricts = async () => {
  const response = await api.get('/districts');
  return response.data;
};

export const geocodeLocation = async (query) => {
  const response = await api.post(`/geocode?query=${encodeURIComponent(query)}`);
  return response.data;
};

export default api;
