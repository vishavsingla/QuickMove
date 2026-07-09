# Review Notes

## 2026-07-10 — Self-review (backend + frontend)

### Fixed / verified
- Atomic driver accept prevents double-assignment (integration test)
- JWT role guards on all protected routes
- Client build passes typecheck + lint
- Backend 63/63 tests green
- Driver payout withdrawal, web push notification stubs
- Driver KYC, coupons, invoices, admin live map, pricing rules
- Prometheus metrics + OTel SDK (OTLP when configured)
- `.env` excluded from git; secrets not committed

### Open findings (to address in next iterations)
- None blocking after security integration tests

### Security
- Passwords hashed with bcrypt (cost 10)
- Admin signup guarded by `ADMIN_SIGNUP_SECRET`
- CORS restricted to `CLIENT_ORIGIN`
- No SQL injection risk (Prisma parameterized queries)
