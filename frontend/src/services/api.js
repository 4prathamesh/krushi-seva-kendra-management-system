import axios from 'axios';
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ksk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;

    // Avoid redirecting on login failure so the UI can show the error message.
    if (status === 401 && requestUrl !== '/auth/login') {
      localStorage.removeItem('ksk_token');
      localStorage.removeItem('ksk_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
