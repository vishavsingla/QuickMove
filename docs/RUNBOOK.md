# QuickMove — Operations Runbook

## 1. Local development

### Start full stack (Docker)
```bash
docker compose up -d          # postgres + redis
cd server && npm run prisma:migrate:dev && npm run seed
cd server && npm run dev      # :5001
cd client && npm run dev      # :3000
```

### Run tests
```bash
cd server && npm test         # 58 integration + unit tests
cd client && npm test         # 9 RTL component tests
cd client && npm run test:e2e # Playwright (needs running stack)
```

## 2. Deployment

### Free cloud ($0)
See **[DEPLOYMENT_FREE.md](DEPLOYMENT_FREE.md)** — Vercel (client) + Render or Fly.io (API) + Neon (Postgres) + Upstash (Redis, optional).

### Docker Compose (production-like)
```bash
docker compose -f docker-compose.yml up --build
```

### Kubernetes
```bash
kubectl apply -f deploy/k8s/
# Requires: Postgres, Redis secrets, env ConfigMap
```

### Environment variables (required)
| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | Prisma connection |
| `ACCESS_TOKEN_PRIVATE_KEY` | random 32+ chars | JWT signing |
| `REFRESH_TOKEN_PRIVATE_KEY` | random 32+ chars | Refresh signing |
| `CLIENT_ORIGIN` | `https://app.example.com` | CORS + Socket.io |
| `ADMIN_SIGNUP_SECRET` | secret | First admin bootstrap |

### Optional
| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Socket.io horizontal scale |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Trace export (e.g. `http://localhost:4318`) |
| `OTEL_SERVICE_NAME` | Service name in traces (default `quickmove-api`) |

## 3. Observability stack

### Start Prometheus + Grafana locally
```bash
cd deploy/observability
docker compose up -d
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3001 (admin / admin)
```

Ensure the API is reachable at `host.docker.internal:5001` (macOS/Windows Docker)
or update `prometheus.yml` target for Linux (`172.17.0.1:5001`).

### Dashboards
- Pre-provisioned: **QuickMove API** (`deploy/observability/grafana/dashboards/quickmove-api.json`)
- Panels: HTTP rate, bookings/h, payments/h, process memory

### Metrics endpoint
```bash
curl -s http://localhost:5001/metrics | head
```

## 4. Incident response

### API unhealthy
1. `curl http://localhost:5001/health` — expect `{ "status": "ok" }`
2. Check Postgres: `npx prisma db execute --stdin <<< "SELECT 1"`
3. Check logs for Prisma connection errors
4. Restart pod/process; verify `DATABASE_URL`

### Socket events not cross-pod
1. Confirm `REDIS_URL` set on all API replicas
2. Log should show: `Socket.io using Redis adapter at ...`
3. Without Redis, only single-node sockets work

### Payments stuck UNPAID
1. Booking must be `COMPLETED` before payment intent
2. Customer wallet needs balance for `method: wallet`
3. Check `PaymentIntent.status` in DB

### Driver not receiving offers
1. Driver `status` must be `APPROVED`
2. `isAvailable` must be true
3. `vehicleType` must match booking
4. KYC `VERIFIED` recommended (not enforced in demo)

## 5. Database operations

### Migrate
```bash
cd server && npx prisma migrate deploy
```

### Seed demo data
```bash
cd server && npm run seed
# admin@quickmove.dev / password123
# user@quickmove.dev / password123
# ravi.driver@quickmove.dev / password123
```

### Backup (Postgres)
```bash
pg_dump $DATABASE_URL > quickmove_backup.sql
```

## 6. Security checklist
- [x] Helmet security headers (verified in `security.test.ts`)
- [x] RBAC on all protected routes
- [x] Rate limits: auth 30/15min, geo 60/min, API 300/min
- [x] Passwords bcrypt-hashed, never returned in API
- [x] `.env` gitignored; use secrets manager in production
- [ ] Rotate JWT secrets periodically in production
- [ ] Enable TLS at ingress/load balancer

## 7. Load testing
```bash
cd deploy/k6
k6 run booking-flow.js
```

## 8. Rollback
1. Revert deployment to previous image tag
2. If schema migration broke: restore DB backup, do not run down migrations in prod
3. Verify `/health` and smoke test login + booking estimate
