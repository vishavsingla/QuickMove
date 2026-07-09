# QuickMove — Task Tracker

Last updated: 2026-07-10

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
- [x] Payments + wallet (test gateway + wallet debit, driver earnings)
- [x] Multi-stop bookings + in-app chat (WebSocket)
- [x] Refresh tokens + rate limiting + Helmet security headers
- [x] k6 load test scripts + Terraform stubs
- [x] Coupons + discounted payments
- [x] Invoice generation + download
- [x] Driver KYC + document upload stubs
- [x] Admin live vehicle map + pricing rules UI
- [x] Prometheus metrics + OpenTelemetry SDK

## In progress
- [ ] Porter/Lalamove parity: driver payouts UI, push notifications, mobile app

## Backlog — Frontend
- [x] Driver earnings dashboard
- [x] Component tests (RTL)

## Backlog — DevOps
- [x] Terraform stub (`deploy/terraform/`)
- [x] k6 load tests (`deploy/k6/`)
- [x] Prometheus scrape config + `/metrics` endpoint
- [x] OpenTelemetry SDK + Grafana dashboard stubs

## Stop conditions
- [x] No placeholders / dummy UI (functional dashboards; KYC uses stub:// doc URLs by design)
- [x] All tests green in CI (58 backend + 9 RTL + 7 e2e)
- [x] k8s manifests ready (`deploy/k8s/`)
- [x] Deep docs complete (HLD, LLD, API, RUNBOOK)
- [x] Security review passed (helmet headers, RBAC, no hash leak tests)
