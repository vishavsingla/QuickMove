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

## In progress
- [ ] Payments + wallet flows

## Backlog — Backend modules
- [ ] Redis: socket adapter, pub/sub, caching
- [ ] Refresh tokens + session hardening
- [ ] Saved addresses, user profile
- [ ] Multi-stop bookings
- [ ] Payment flow (test gateway), wallet, coupons
- [ ] In-app chat + typing/presence
- [ ] Invoice generation
- [ ] Rate limiting, audit logs
- [ ] Driver KYC fields, earnings/payouts

## Backlog — Frontend
- [ ] Profile + saved addresses UI
- [ ] Multi-stop booking UI
- [ ] Chat panel
- [ ] Payment checkout
- [ ] Invoice download
- [ ] Driver earnings dashboard
- [ ] Admin live vehicle map, pricing rules editor
- [ ] Playwright e2e suite
- [ ] Component tests (RTL)

## Backlog — DevOps
- [ ] Multi-stage Dockerfiles (server + client)
- [ ] Kubernetes manifests + Helm chart
- [ ] Terraform stub
- [ ] Prometheus/Grafana, OpenTelemetry stubs
- [ ] k6 load tests

## Stop conditions
- [ ] No placeholders / dummy UI
- [ ] All tests green in CI
- [ ] k8s manifests ready
- [ ] Deep docs complete
- [ ] Security review passed
