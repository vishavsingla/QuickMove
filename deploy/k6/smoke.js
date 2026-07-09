import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE = __ENV.API_URL || "http://localhost:5001";

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  const estimate = http.post(
    `${BASE}/api/geo/estimate`,
    JSON.stringify({
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      dropoffLat: 12.9352,
      dropoffLng: 77.6245,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(estimate, {
    "estimate 200": (r) => r.status === 200,
    "has quotes": (r) => JSON.parse(r.body).quotes?.length > 0,
  });

  sleep(0.5);
}
