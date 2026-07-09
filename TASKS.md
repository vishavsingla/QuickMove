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

## In progress
- [ ] Porter/Lalamove feature parity (coupons, invoices, KYC, admin live map)

## Backlog — Backend modules
- [ ] Invoice generation
- [ ] Driver KYC fields, earnings/payouts
- [ ] Coupons, pricing rules API

## Backlog — Frontend
- [ ] Invoice download
- [ ] Driver earnings dashboard
- [ ] Admin live vehicle map, pricing rules editor
- [ ] Component tests (RTL)

## Backlog — DevOps
- [x] Terraform stub (`deploy/terraform/`)
- [x] k6 load tests (`deploy/k6/`)
- [ ] Prometheus/Grafana, OpenTelemetry stubs

## Stop conditions
- [ ] No placeholders / dummy UI
- [ ] All tests green in CI
- [ ] k8s manifests ready
- [ ] Deep docs complete
- [ ] Security review passed
