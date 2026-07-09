# Changelog

## [Unreleased]

### Added
- Driver bank withdrawal: `POST /api/driver/bank`, `POST /api/driver/withdraw`, `GET /api/driver/payouts`
- Full OpenTelemetry Node SDK (OTLP exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` set)
- Grafana dashboard stub + `deploy/observability/docker-compose.yml` (Prometheus + Grafana)
- Vitest + React Testing Library component tests (Badge, RequireRole, ui helpers)
- Real driver GPS via `navigator.geolocation` with simulation fallback when denied
- Driver earnings dashboard: `GET /api/driver/earnings`, summary on driver page + `/driver/earnings`
- Prometheus `/metrics` with HTTP, booking, and payment counters
- OpenTelemetry bootstrap stub + `deploy/observability/prometheus.yml`
- Admin live driver map with REST poll + socket `admin:driverLocation`
- DB-backed `PricingRule` model with admin editor; fares use cached rules
- Driver KYC: document upload stubs, admin verify/reject, driver dashboard KYC card
- Demo coupons `WELCOME50` and `SAVE20` in seed
- Terraform stubs: VPC, RDS Postgres, ElastiCache Redis (`deploy/terraform/`)
- Short-lived access tokens (15m default) + 7-day refresh tokens
- Rate limiting: auth (30/15min), geo (60/min), API (300/min)
- Helmet security headers + 1MB JSON body limit
- Client auto-refresh on 401 with rotated refresh tokens
- In-app chat: `GET /api/bookings/:id/chat`, Socket.io `chat:send` / `chat:message` / `chat:typing`
- `ChatPanel` component on customer tracking and driver active job views
- Multi-stop UI on `/book` (add/remove up to 5 waypoints)
- Integration tests for multi-stop + chat (38 total backend tests)
- Saved addresses CRUD (`/api/user/addresses`)
- Profile page with address management
- Root `docker-compose.yml` (postgres + redis + server + client)
- Multi-stage Dockerfiles for server and client
- Deep HLD document with Mermaid architecture, ER, and sequence diagrams
- Kubernetes manifests under `deploy/k8s/`
- Root README with quick start guide

## [0.2.0] — 2026-07-10

### Added
- Full backend API rebuild (auth, geo, bookings, driver, admin, notifications)
- Prisma migration + seed script with demo users/drivers
- Jest unit + integration test suite (31 tests)
- Design docs: PRD, RFC, architecture overview, API contract

## [0.1.0] — 2024-10

### Added
- Initial skeleton: partial auth, booking routers, Next.js client stubs
