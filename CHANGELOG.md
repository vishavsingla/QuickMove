# Changelog

## [Unreleased]

### Added
- Next.js frontend: landing page, auth, booking flow with live fare quotes,
  live map tracking, driver dashboard with job offers + GPS simulation,
  admin console with charts and driver approval queue
- AuthProvider + SocketProvider wired to JWT + Socket.io
- Leaflet-based maps with OpenStreetMap tiles
- Address search component backed by Nominatim API
- Notification bell with real-time socket toasts

### Changed
- Replaced old Redux/cookie auth with JWT localStorage auth
- Removed legacy `(pages)` route structure

## [0.2.0] — 2026-07-10

### Added
- Full backend API rebuild (auth, geo, bookings, driver, admin, notifications)
- Prisma migration + seed script with demo users/drivers
- Jest unit + integration test suite (31 tests)
- Design docs: PRD, RFC, architecture overview, API contract

## [0.1.0] — 2024-10

### Added
- Initial skeleton: partial auth, booking routers, Next.js client stubs
