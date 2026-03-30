import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8085/api",
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

// INTERCEPTOR TOKEN
api.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

  },
  (error) => Promise.reject(error)
);

export default api;