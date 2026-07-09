import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE = __ENV.API_URL || "http://localhost:5001";

export const options = {
  vus: Number(__ENV.K6_VUS || 3),
  duration: __ENV.K6_DURATION || "20s",
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<1200"],
  },
};

const users = new SharedArray("users", function () {
  return [
    { email: "user@quickmove.dev", password: "password123" },
    { email: "admin@quickmove.dev", password: "password123" },
  ];
});

export default function () {
  const creds = users[__VU % users.length];
  const login = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify(creds),
    { headers: { "Content-Type": "application/json" } }
  );
  check(login, { "login 200": (r) => r.status === 200 });
  if (login.status !== 200) return;

  const { token } = JSON.parse(login.body);
  const me = http.get(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(me, { "me 200": (r) => r.status === 200 });

  const bookings = http.get(`${BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(bookings, {
    "bookings ok": (r) => r.status === 200 || r.status === 403,
  });

  sleep(1);
}
