# Changelog

## [Unreleased]

### Added
- User profile API (`GET/PATCH /api/user/profile`)
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
