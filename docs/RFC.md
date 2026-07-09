# RFC: QuickMove Platform Architecture & Delivery

Status: Accepted
Owner: QuickMove team

## Summary
Build QuickMove end to end: a Next.js frontend, an Express/TypeScript API with
Prisma + PostgreSQL, and a Socket.io realtime layer, matching customers to
drivers with dynamic pricing and live tracking. Ship it with automated tests,
CI/CD, containers, and Kubernetes manifests. No paid third-party APIs.

## Motivation
An earlier attempt stalled after authentication. This RFC defines a stable
contract and a phased delivery plan so the platform can be completed reliably,
with each phase independently tested and merged behind green CI.

## Key design decisions

### 1. Key-free geo + pricing
- **Geocoding / address search:** Nominatim (OpenStreetMap).
- **Routing (distance + duration):** OSRM public server.
- **Fallback:** haversine distance × a road factor, with an average-speed
  duration estimate, used whenever OSRM/Nominatim are unreachable.
- **Pricing:** deterministic engine = base + perKm·distance + perMin·duration,
  clamped to a per-vehicle minimum, multiplied by a time-of-day surge.
  Rationale: fully local, deterministic, and testable without network access.

### 2. Auth
- Stateless JWT carrying `{ id, role, driverId? }`.
- `requireAuth` reads a Bearer token (or cookie) and `requireRole(...)` guards
  role-specific routes. Rationale: simple, horizontally scalable, easy to test.

### 3. Driver matching
- On booking creation, find APPROVED + available drivers whose `vehicleType`
  matches, ranked by haversine distance from pickup, and offer the job to each
  (DB notification + `job:new` socket event).
- Acceptance is an atomic conditional update (`updateMany` where status is still
  PENDING and unassigned), so exactly one driver can win.

### 4. Realtime model
- Socket.io rooms: `user:{id}`, `driver:{id}`, `booking:{id}`.
- Drivers stream `driver:location`; the server persists it and rebroadcasts
  `booking:driverLocation` to the relevant customer/booking room.
- Status changes and notifications are emitted from the REST handlers via small
  realtime helper functions, keeping a single source of truth.

### 5. Data model
See `docs/ARCHITECTURE.md` and `docs/API.md`. Postgres via Prisma; enums for
role, vehicle type, and booking status.

## Delivery phases (each behind green CI, merged via PR)
1. Design docs + API contract (this set).
2. Backend APIs + backend unit/integration tests.
3. Frontend (user/driver/admin) wired to backend + sockets + component tests.
4. QA: end-to-end (Playwright) coverage of core journeys.
5. DevOps: Dockerfiles, docker-compose, GitHub Actions CI/CD, Kubernetes.
6. Review hardening passes (code review, security, bugs) each round.

## Testing strategy
- **Unit:** pricing, geo (haversine + OSRM/fallback), jwt.
- **Integration:** all API routes against a real Postgres test DB (happy paths
  + auth/role failures, invalid input, double-accept, cancel/rate).
- **E2E:** Playwright drives user/driver/admin journeys against a locally
  started client + server.
- CI runs lint + typecheck + build + unit + integration (+ e2e) with a Postgres
  service container; green is required to merge.

## Risks & mitigations
- **Public OSRM/Nominatim rate limits:** haversine fallback keeps the app
  functional; production can point env vars at self-hosted instances.
- **Concurrent job acceptance:** solved via atomic conditional update.
- **Realtime consistency:** REST remains the source of truth; sockets only
  broadcast state that has already been persisted.
