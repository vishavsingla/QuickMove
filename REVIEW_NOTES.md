# Review Notes

## 2026-07-10 — Self-review (backend + frontend)

### Fixed / verified
- Atomic driver accept prevents double-assignment (integration test)
- JWT role guards on all protected routes
- Client build passes typecheck + lint
- Backend 31/31 tests green
- `.env` excluded from git; secrets not committed

### Open findings (to address in next iterations)
- Access token TTL is 7d; add refresh token rotation for production
- No rate limiting on auth/geo endpoints yet
- Driver GPS on frontend is simulated; real `navigator.geolocation` needed for mobile
- Payment, wallet, chat, multi-stop not implemented yet
- CI workflow needs to be pushed under `.github/workflows/`
- Redis not yet integrated for socket horizontal scaling
- Docs in `docs/` are surface-level; deep HLD/LLD with Mermaid pending

### Security
- Passwords hashed with bcrypt (cost 10)
- Admin signup guarded by `ADMIN_SIGNUP_SECRET`
- CORS restricted to `CLIENT_ORIGIN`
- No SQL injection risk (Prisma parameterized queries)
