import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  withCredentials: true, // REQUIRED: lets the browser send/receive the httpOnly refreshToken cookie
});

// --- Attach the access token to every outgoing request, same as before ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Refresh queue machinery ---------------------------------------------
let isRefreshing = false;
let failedQueue = [];

// Called once the in-flight refresh finishes (success OR failure).
// Releases every request that was queued up waiting for it.
function processQueue(error, newToken = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(newToken);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Only handle 401s, and never retry the refresh call itself if IT
    // returns 401 (that would loop forever). _retry marks a request we've
    // already attempted once, so we don't retry the same request twice.
    if (err.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(err);
    }

    // Never intercept a failed /auth/refresh call — treat it as final.
    if (originalRequest.url?.includes("/auth/refresh")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(err);
    }

    if (isRefreshing) {
      // A refresh is already happening — queue this request instead of
      // starting a second refresh call (which would hit a dead, rotated
      // token and trigger reuse-detection).
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((queueErr) => Promise.reject(queueErr));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      const newAccessToken = data.data.accessToken; // matches your { status, data: {...} } response shape

      localStorage.setItem("token", newAccessToken);
      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken); // release anyone who was waiting
      return api(originalRequest); // retry the request that originally failed
    } catch (refreshErr) {
      processQueue(refreshErr, null); // reject everyone who was waiting
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
