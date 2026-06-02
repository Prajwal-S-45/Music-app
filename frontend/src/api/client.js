import axios from 'axios';

// Prefer the backend running on 5001 in dev; allow overriding via VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const fallbackBaseURL = import.meta.env.VITE_API_FALLBACK_URL || 'http://localhost:5000';

const isLocalPrimaryHost = (url) => {
  return /^https?:\/\/(localhost|127\.0\.0\.1):5000/i.test(String(url || ''));
};

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const noResponse = !error?.response;

    if (
      originalRequest &&
      noResponse &&
      !originalRequest.__didLocalFallbackRetry &&
      isLocalPrimaryHost(originalRequest.baseURL || baseURL)
    ) {
      originalRequest.__didLocalFallbackRetry = true;
      originalRequest.baseURL = fallbackBaseURL;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { baseURL };
