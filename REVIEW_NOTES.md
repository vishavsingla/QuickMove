# Review Notes

## 2026-07-10 — Self-review (backend + frontend)

### Fixed / verified
- Atomic driver accept prevents double-assignment (integration test)
- JWT role guards on all protected routes
- Client build passes typecheck + lint
- Backend 51/51 tests green
- Driver KYC, coupons, invoices, admin live map, pricing rules
- Prometheus metrics + OTel stub
- `.env` excluded from git; secrets not committed

### Open findings (to address in next iterations)
- Driver GPS on frontend is simulated; real `navigator.geolocation` needed for mobile
- Full OTel SDK wiring when collector is available

### Security
- Passwords hashed with bcrypt (cost 10)
- Admin signup guarded by `ADMIN_SIGNUP_SECRET`
- CORS restricted to `CLIENT_ORIGIN`
- No SQL injection risk (Prisma parameterized queries)
