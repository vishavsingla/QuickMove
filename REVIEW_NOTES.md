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

## 2026-07-10 — Staff review (iteration 6)

### Verified
- Driver payout withdrawal: bank save, min amount, balance debit, history API
- Web push stubs: subscribe/unsubscribe/status, auth guard, service worker
- All stop conditions hold: 64 backend + 9 RTL + 7 e2e, CI green
- Security: helmet, RBAC, push subscribe requires auth

### Open findings
- Mobile app (React Native) — future scope
- Production web push needs VAPID keys and real push gateway

### Security
- Passwords hashed with bcrypt (cost 10)
- Admin signup guarded by `ADMIN_SIGNUP_SECRET`
- CORS restricted to `CLIENT_ORIGIN`
- No SQL injection risk (Prisma parameterized queries)
