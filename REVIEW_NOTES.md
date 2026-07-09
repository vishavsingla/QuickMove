# Review Notes

## 2026-07-10 — Self-review (backend + frontend)

### Fixed / verified
- Atomic driver accept prevents double-assignment (integration test)
- JWT role guards on all protected routes
- Client build passes typecheck + lint
- Backend 38/38 tests green
- Redis Socket.io adapter for horizontal scaling
- Payments + wallet flows with test gateway
- Multi-stop bookings + in-app chat (REST + WebSocket)
- `.env` excluded from git; secrets not committed

### Open findings (to address in next iterations)
- Access token TTL is 7d; add refresh token rotation for production
- No rate limiting on auth/geo endpoints yet
- Driver GPS on frontend is simulated; real `navigator.geolocation` needed for mobile
- k6 load tests and Terraform stubs pending

### Security
- Passwords hashed with bcrypt (cost 10)
- Admin signup guarded by `ADMIN_SIGNUP_SECRET`
- CORS restricted to `CLIENT_ORIGIN`
- No SQL injection risk (Prisma parameterized queries)
