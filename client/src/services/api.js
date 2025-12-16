import axios from 'axios';

// Vercel / Production: VITE_API_URL=https://my-pern-app-backend.onrender.com
// Local fallback: http://localhost:5000
const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Always append /api here (backend routes start with /api)
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Allow FormData (file uploads) to set its own headers
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

export default api;
