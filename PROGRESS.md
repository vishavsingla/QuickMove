# QuickMove — Progress Log

## 2026-07-10

### Iteration 1 — Foundation
- Cloned repo, configured personal git identity + push token
- Rebuilt Express/Prisma/Postgres/Socket.io backend from scratch
- Prisma schema: users, drivers, vehicles, bookings, notifications
- Key-free geo (Nominatim + OSRM + haversine fallback)
- Dynamic pricing engine with surge
- Driver matching + atomic job acceptance
- 31 backend tests passing
- Merged PR #1 (design docs), PR #2 (backend)

### Iteration 2 — Frontend (current)
- Rebuilt Next.js 14 client against new `/api` contract
- JWT auth via localStorage + AuthProvider
- Socket.io provider with room registration
- Pages: landing, login, signup, driver signup, book, bookings list,
  live tracking, driver dashboard, admin analytics
- Leaflet maps (no Google API key)
- Address autocomplete via backend Nominatim proxy
- Client build green, backend tests green

### Iteration 3 — Platform infrastructure + user profile
- User profile API + saved addresses (Prisma migration)
- Profile page in client
- Root docker-compose (postgres + redis + server + client)
- Multi-stage Dockerfiles
- Deep HLD doc with 5 Mermaid sequence diagrams + ER + deployment
- Kubernetes manifests under deploy/k8s/
- Root README with quick start

### Iteration 5 — Payments + wallet (PR #7)
- Wallet ledger, top-up, test gateway payment intents
- `/wallet` page + checkout on completed bookings

### Iteration 10 — KYC, admin ops, observability
- Driver KYC submit/review with document upload stubs
- Admin live driver map + DB-backed pricing rules editor
- Prometheus `/metrics` + OpenTelemetry bootstrap stub
- 51 backend tests passing

### Iteration 6 — Payouts + push
- Driver bank withdrawal API + earnings page UI (PR #22)
- Web push stubs: service worker, PushSubscription, subscribe API
- 64 backend tests, 9 client RTL tests; CI green

### Iteration 7 — Razorpay + parity gaps (current)
- Razorpay test-mode integration with key-optional mock checkout
  (order → checkout modal → HMAC verify → webhook)
- `PaymentCheckout` component: Wallet / Card / UPI via Razorpay
- Wallet top-up via Razorpay flow + legacy instant test credit
- Saved-address quick-pick on `/book`, scheduled booking datetime picker
- Cancellation modal with reason + automatic wallet refund when paid
- ETA countdown on customer tracking page
- 81 backend tests; client build + lint green
- Auth session persistence fix: single-flight refresh, bootstrap rehydrate on reload

### Next
- Mobile app (React Native) — future scope
- Invoice PDF export
