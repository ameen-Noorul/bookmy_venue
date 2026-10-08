// Simulates the axios interceptor's exact logic in Node, using a real
// cookie jar (so the httpOnly refreshToken cookie behaves like a browser).
// Run with: node test-interceptor.js

const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const jar = new CookieJar();
const api = wrapper(
  axios.create({
    baseURL: "http://localhost:5000",
    jar,
    withCredentials: true,
  }),
);

let passCount = 0;
let failCount = 0;
function check(label, condition, extra = "") {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${label} ${extra}`);
    failCount++;
  }
}

// --- Node-compatible stand-ins for browser globals used by the real interceptor ---
let fakeLocalStorage = {};
function setToken(t) {
  fakeLocalStorage.token = t;
}
function getToken() {
  return fakeLocalStorage.token;
}
let redirectedToLogin = false;

// --- Request interceptor: same as your real one ---
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Response interceptor: same logic as client/src/api/axios.js ---
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, newToken = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(err);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      redirectedToLogin = true;
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      const newAccessToken = data.data.accessToken;
      setToken(newAccessToken);
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      redirectedToLogin = true;
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

async function main() {
  const suffix = Date.now();
  const email = `interceptortest_${suffix}@test.com`;
  const password = "password123";

  // Step 1: register — real interceptor's request phase attaches nothing yet (no token stored)
  const registerRes = await api.post("/auth/register", {
    email,
    password,
    name: "Interceptor Test",
  });
  setToken(registerRes.data?.data?.accessToken);
  check("Register succeeds, token stored", !!getToken());

  // Step 2: a normal authenticated call works with the valid token
  const meRes1 = await api.get("/auth/me");
  check(
    "Authenticated request succeeds with valid token",
    meRes1.status === 200,
  );

  // Step 3: corrupt the token (simulate expiry) — next call should 401,
  // interceptor should silently refresh and retry, caller sees success.
  setToken("this-is-a-deliberately-invalid-token");
  const meRes2 = await api.get("/auth/me");
  check(
    "Expired token triggers silent refresh + retry (caller sees 200, not 401)",
    meRes2.status === 200,
    `got ${meRes2.status}`,
  );
  check(
    "Interceptor did NOT force a login redirect on recoverable 401",
    !redirectedToLogin,
  );

  // Step 4: fire 3 simultaneous requests with a bad token — only ONE
  // refresh call should happen (proves the queue prevents parallel refreshes
  // from reusing an already-rotated token and triggering reuse-detection).
  setToken("another-invalid-token");
  let refreshCallCount = 0;
  const originalPost = api.post.bind(api);
  api.post = (...args) => {
    if (args[0] === "/auth/refresh") refreshCallCount++;
    return originalPost(...args);
  };

  const results = await Promise.allSettled([
    api.get("/auth/me"),
    api.get("/auth/me"),
    api.get("/auth/me"),
  ]);
  const allSucceeded = results.every(
    (r) => r.status === "fulfilled" && r.value.status === 200,
  );
  check(
    "All 3 concurrent requests succeed after one shared refresh",
    allSucceeded,
  );
  check(
    "Only ONE /auth/refresh call fired for 3 concurrent 401s (queue worked)",
    refreshCallCount === 1,
    `got ${refreshCallCount}`,
  );

  api.post = originalPost;

  printSummary();
}

function printSummary() {
  console.log("\n----------------------------------------");
  console.log(`${passCount} passed, ${failCount} failed`);
  console.log("----------------------------------------");
}

main().catch((err) => {
  console.error("Script crashed:", err.message);
  if (err.response)
    console.error("Response:", err.response.status, err.response.data);
});
