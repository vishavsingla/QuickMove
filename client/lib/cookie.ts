import { deleteCookie, getCookie, setCookie } from 'cookies-next';
import axios from 'axios';
// import { cookies } from 'next/headers';
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await axios.post('/auth/user/refresh-token', null, {
          withCredentials: true,
        });

        const newAccessToken = response.data.accessToken;
        const newSessionToken = response.data.sessionToken;
        setCookie('accessToken', newAccessToken, { path: '/' });
        setCookie('sessionToken', newSessionToken, { path: '/' });

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (err) {
        console.error('Failed to refresh access token', err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
// export const sessionToken = getCookie('sessionToken',{cookies});
// export const accessToken = getCookie('accessToken',{cookies});