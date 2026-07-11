# QuickMove

Real-time logistics and moving platform — book moves, match nearby drivers,
track live on the map, and manage the marketplace from an admin console.

## Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind, shadcn/ui, Leaflet, Socket.io
- **Backend**: Express, TypeScript, Prisma, PostgreSQL, Socket.io
- **Geo**: Nominatim + OSRM (no paid API keys; haversine fallback)

## Quick start (local)

```bash
# 1. Start Postgres
cd server && docker compose up -d

# 2. Backend
cp server/.env.example server/.env   # edit if needed
cd server && npm install
npx prisma migrate dev
npm run seed
npm run dev                          # http://localhost:5001

# 3. Frontend (new terminal)
cd client && npm install
cp client/.env.example client/.env.local
npm run dev                          # http://localhost:3000
```

### Demo logins (after seed)
| Role | Email | Password |
|------|-------|----------|
| Customer | user@quickmove.dev | password123 |
| Admin | admin@quickmove.dev | password123 |
| Driver | ravi.driver@quickmove.dev | password123 |

## Docker (full stack)

```bash
docker compose up --build
# API: http://localhost:5001  |  Web: http://localhost:3000
```

## Deployed stack (production)

After following [Free cloud deployment](docs/DEPLOYMENT_FREE.md):

| Service | Typical URL | Env var |
|---------|-------------|---------|
| Web (Vercel) | `https://your-app.vercel.app` | `NEXT_PUBLIC_API_URL` → API URL |
| API (Render) | `https://quickmove-api.onrender.com` | `CLIENT_ORIGIN` + `CORS_ORIGINS` → web URL(s) |
| Postgres (Neon) | pooled + direct URLs | `DATABASE_URL`, `DIRECT_URL` |
| Redis (Upstash, optional) | `rediss://…` | `REDIS_URL` |

**Smoke test after deploy:**

```bash
curl -s https://quickmove-api.onrender.com/health
# → {"status":"ok","service":"quickmove"}
```

Log in with seeded demo accounts (run `npm run seed` against Neon once). Set `TRUST_PROXY=1` on Render so rate limiting works behind the load balancer.

## Tests

```bash
cd server && npm test              # 31 unit + integration tests
cd client && npm run build         # typecheck + production build
```

## Docs
- [HLD](docs/HLD.md) — architecture, ER, sequence diagrams
- [API contract](docs/API.md)
- [PRD](docs/PRD.md)
- [Architecture overview](ARCHITECTURE.md)
- [**Free cloud deployment**](docs/DEPLOYMENT_FREE.md) — Vercel + Render + Neon ($0)

## Project structure

```
quickmove/
├── client/          Next.js web app
├── server/          Express API + Socket.io
├── docs/            Design documents
├── deploy/k8s/      Kubernetes manifests
├── docker-compose.yml
└── .github/workflows/ci.yml
```
