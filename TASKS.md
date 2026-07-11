# QuickMove — Task Tracker

Last updated: 2026-07-12

## Done
- [x] Design docs + API contract (PR #1)
- [x] Backend core + tests (PR #2)
- [x] Frontend rebuild + CI (PR #3)
- [x] User profile + saved addresses API
- [x] Docker-compose full stack + Dockerfiles
- [x] Deep HLD with Mermaid diagrams
- [x] Kubernetes manifests (deploy/k8s)
- [x] Root README
- [x] Playwright e2e (7 tests) + CI job
- [x] Redis Socket.io adapter (horizontal scale)
- [x] Payments + wallet (Razorpay test/mock gateway + wallet debit, driver earnings)
- [x] Multi-stop bookings + in-app chat (WebSocket)
- [x] Refresh tokens + rate limiting + Helmet security headers
- [x] k6 load test scripts + Terraform stubs
- [x] Coupons + discounted payments
- [x] Invoice generation + download
- [x] Driver KYC + document upload stubs
- [x] Admin live vehicle map + pricing rules UI
- [x] Prometheus metrics + OpenTelemetry SDK
- [x] Driver payout withdrawal UI + API
- [x] Web push notification stubs (service worker + subscribe API)
- [x] Razorpay order/verify/webhook + mock checkout (key-optional)
- [x] Saved-address quick-pick on booking flow
- [x] Scheduled bookings UI
- [x] Cancellation with reason + wallet refund
- [x] ETA countdown on live tracking
- [x] Polished payment checkout modal (Wallet / Card / UPI)
- [x] Invoice PDF export (`?format=pdf`, client download)
- [x] Render trust proxy (`TRUST_PROXY=1`) for rate limiting behind load balancer
- [x] Mobile nav sheet menu + responsive padding on book/tracking pages
- [x] README deployed-stack quick reference

## In progress
- _(none)_

## Backlog — Frontend
- [x] Driver earnings dashboard
- [x] Component tests (RTL)
- [x] Invoice PDF export (HTML + PDF download)

## Backlog — DevOps
- [x] Terraform stub (`deploy/terraform/`)
- [x] k6 load tests (`deploy/k6/`)
- [x] Prometheus scrape config + `/metrics` endpoint
- [x] OpenTelemetry SDK + Grafana dashboard stubs

## Backlog — Future
- [ ] Porter/Lalamove parity: mobile app (React Native)
- [ ] Driver demand heatmap (admin analytics)
- [ ] Production web push (VAPID keys + real gateway)

## Stop conditions
- [x] No placeholders / dummy UI (functional dashboards; KYC/push use intentional stubs)
- [x] All tests green in CI (83 backend + 18 RTL + 7 e2e)
- [x] k8s manifests ready (`deploy/k8s/`)
- [x] Deep docs complete (HLD, LLD, API, RUNBOOK)
- [x] Security review passed (helmet headers, RBAC, no hash leak tests)
