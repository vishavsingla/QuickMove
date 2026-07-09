# QuickMove — Task Tracker

Last updated: 2026-07-10

## Done
- [x] Design docs + API contract (PR #1)
- [x] Backend core: auth, geo/pricing, bookings, driver matching, admin, sockets (PR #2)
- [x] Backend unit + integration tests (31 tests, Postgres)
- [x] Frontend rebuild: landing, auth, book flow, live tracking, driver dashboard, admin console

## In progress
- [ ] Merge frontend PR + CI workflow
- [ ] Deep HLD/LLD docs with Mermaid diagrams
- [ ] Full docker-compose stack (postgres + server + client)
- [ ] GitHub Actions: lint, typecheck, build, server tests, client build

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
