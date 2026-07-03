import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    // In a real scenario you might grab the token from context/zustand,
    // but typically it's better to store accessToken in memory (Context) 
    // and inject it here, or just rely on cookies.
    // For this implementation, we will inject it from a getter or global variable if needed,
    // or rely on the AuthContext to set it. We'll set a default header in AuthContext.
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept refresh token request itself or logout
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('connectify_refresh_token');
        const { data } = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        // Set the new token for future requests globally
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        localStorage.setItem('connectify_access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('connectify_refresh_token', newRefreshToken);
          // Also update the sessions array so account switching stays consistent
          try {
            const sessions = JSON.parse(localStorage.getItem('connectify_sessions') || '[]');
            const idx = sessions.findIndex((s: any) => s.accessToken === storedRefreshToken || s.refreshToken === storedRefreshToken);
            if (idx >= 0) {
              sessions[idx].accessToken = accessToken;
              sessions[idx].refreshToken = newRefreshToken;
              localStorage.setItem('connectify_sessions', JSON.stringify(sessions));
            }
          } catch { /* ignore parse errors */ }
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Dispatch a custom event to logout the user
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
