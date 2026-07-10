# QuickMove — Free Cloud Deployment ($0)

Deploy the full stack on free tiers: **Vercel** (frontend), **Render** or **Fly.io** (API + WebSockets), **Neon** (Postgres), **Upstash** (Redis, optional).

Geocoding/routing stays free (Photon, Nominatim, OSRM) — no API keys needed.

---

## Architecture

```
Browser  →  Vercel (Next.js client)
              ↓ NEXT_PUBLIC_API_URL
           Render / Fly.io (Express + Socket.io)
              ↓                    ↓
           Neon Postgres      Upstash Redis (optional)
```

**Why not Vercel for the API?** Socket.io needs a persistent process; Vercel serverless cannot hold WebSocket connections.

---

## Prerequisites

- GitHub repo with QuickMove pushed to `main`
- Accounts (all have free tiers):
  - [Neon](https://neon.tech) — Postgres
  - [Upstash](https://upstash.com) — Redis (optional but recommended)
  - [Render](https://render.com) **or** [Fly.io](https://fly.io) — API
  - [Vercel](https://vercel.com) — frontend

---

## Step 1 — Neon Postgres

1. Sign up at [neon.tech](https://neon.tech) → **New Project** (e.g. `quickmove`).
2. Copy both connection strings from the dashboard:
   - **Pooled** → `DATABASE_URL` (app runtime; includes `-pooler` in host)
   - **Direct** → `DIRECT_URL` (Prisma migrations)
3. Enable **Connection pooling** if not already on.

Example shape (yours will differ):

```
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Free-tier caveat:** Neon autosuspends after ~5 min idle. First query after sleep adds ~1–2 s cold start.

---

## Step 2 — Upstash Redis (optional)

Socket.io works without Redis on a single API instance. Add Upstash if you want the Redis adapter ready for scaling.

1. Sign up at [upstash.com](https://upstash.com) → **Create database** → region near your API.
2. In the Upstash console, open your database → **Details** → copy the **TLS enabled** endpoint (**Redis URL**). Use a fresh token if you rotated credentials or see `Socket closed unexpectedly` in API logs.
3. The URL **must** use the `rediss://` scheme (double `s` = TLS). Upstash will not work with plain `redis://`.

```
REDIS_URL=rediss://default:<UPSTASH_TOKEN>@<name>-<id>.upstash.io:6379
```

Example shape (your host and token will differ):

```
REDIS_URL=rediss://default:AbCdEf123456@magical-mosquito-162958.upstash.io:6379
```

**Render:** Dashboard → `quickmove-api` → **Environment** → add `REDIS_URL` with the full Upstash TLS URL (no quotes). If Redis is unreachable or the token is wrong/expired, the API logs once and continues in single-node Socket.io mode — realtime still works on one instance.

Skip this step to run single-node Socket.io (fine for learning).

---

## Step 3 — Deploy API to Render (recommended)

Config file: [`render.yaml`](../render.yaml) at repo root.

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo (`main` branch).
3. Render reads `render.yaml` and creates `quickmove-api` web service.
4. Set **manual** env vars Render cannot guess:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `CLIENT_ORIGIN` | Your Vercel URL (set after Step 4), e.g. `https://quickmove.vercel.app` |

Render auto-generates `ACCESS_TOKEN_PRIVATE_KEY`, `REFRESH_TOKEN_PRIVATE_KEY`, and `ADMIN_SIGNUP_SECRET` — save `ADMIN_SIGNUP_SECRET` somewhere safe.

5. Wait for deploy. Note the service URL, e.g. `https://quickmove-api.onrender.com`.

**Verify:**

```bash
curl https://quickmove-api.onrender.com/health
# → {"status":"ok","service":"quickmove"}
```

**Free-tier caveats:**

- Service spins down after ~15 min idle; first request may take 30–60 s (cold start).
- Free web services have monthly hours cap — enough for a learning project.

---

## Step 3 (alternative) — Deploy API to Fly.io

Config: [`server/fly.toml`](../server/fly.toml) + [`server/Dockerfile`](../server/Dockerfile).

```bash
cd server
fly auth login
fly launch          # pick app name, region; say no to Postgres/Redis add-ons
fly secrets set \
  DATABASE_URL="postgresql://..." \
  DIRECT_URL="postgresql://..." \
  ACCESS_TOKEN_PRIVATE_KEY="$(openssl rand -hex 32)" \
  REFRESH_TOKEN_PRIVATE_KEY="$(openssl rand -hex 32)" \
  ADMIN_SIGNUP_SECRET="$(openssl rand -hex 16)" \
  CLIENT_ORIGIN="https://your-app.vercel.app"
# optional:
fly secrets set REDIS_URL="rediss://..."
fly deploy
```

Migrations run via `release_command` in `fly.toml` before each deploy.

```bash
curl https://quickmove-api.fly.dev/health
```

---

## Step 4 — Deploy frontend to Vercel

1. [Vercel Dashboard](https://vercel.com) → **Add New Project** → import GitHub repo.
2. **Root Directory:** `client`
3. Framework: Next.js (auto-detected). [`client/vercel.json`](../client/vercel.json) sets `npm ci` + `npm run build`.
4. **Environment variable** (Production + Preview):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Render/Fly API URL, e.g. `https://quickmove-api.onrender.com` |

No trailing slash. Must be `https://` in production.

5. Deploy. Note your URL, e.g. `https://quickmove.vercel.app`.

---

## Step 5 — Wire CORS (API ↔ frontend)

Go back to Render (or Fly) and set:

```
CLIENT_ORIGIN=https://quickmove.vercel.app
```

Must match the Vercel URL exactly (scheme + host, no trailing slash). Redeploy if needed.

Both Express CORS and Socket.io CORS read `CLIENT_ORIGIN` from env — no code changes required.

---

## Step 6 — Seed the production database (once)

Creates demo users, drivers, and pricing rules. Run **from your laptop** against Neon:

```bash
cd server
npm ci
npm run build
DATABASE_URL="postgresql://...pooled..." \
DIRECT_URL="postgresql://...direct..." \
npm run seed:prod
```

Or with dev seed script (requires devDependencies):

```bash
cd server
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npm run seed
```

**Demo logins after seed:**

| Role | Email | Password |
|------|-------|----------|
| Customer | user@quickmove.dev | password123 |
| Admin | admin@quickmove.dev | password123 |
| Driver | ravi.driver@quickmove.dev | password123 |

---

## Environment variable reference

### API (Render / Fly / Docker)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon pooled connection |
| `DIRECT_URL` | Yes | Neon direct (migrations) |
| `ACCESS_TOKEN_PRIVATE_KEY` | Yes | Random 32+ char secret |
| `REFRESH_TOKEN_PRIVATE_KEY` | Yes | Random 32+ char secret |
| `CLIENT_ORIGIN` | Yes | Vercel frontend URL |
| `ADMIN_SIGNUP_SECRET` | Yes | Protects admin registration |
| `REDIS_URL` | No | Upstash **TLS** URL: `rediss://default:<token>@<host>.upstash.io:6379` — copy from Upstash console (TLS enabled). Omit for single-node sockets. |
| `PORT` | Auto | Set by platform (5001 default) |

### Frontend (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | Yes | Public API base URL (REST + Socket.io) |

---

## Verification checklist

After all steps:

- [ ] `curl https://<api>/health` → `{"status":"ok"}`
- [ ] Open Vercel URL — home page loads
- [ ] Login as `user@quickmove.dev` / `password123`
- [ ] Book flow: search address → get estimate → create booking
- [ ] Driver login → toggle availability → see offers
- [ ] Realtime: open booking detail — socket connects (browser devtools → Network → WS)
- [ ] Admin: `admin@quickmove.dev` → dashboard stats load

**Socket debug:** In browser console, no CORS errors to API origin. WS URL should be your `NEXT_PUBLIC_API_URL`, not `localhost:5001`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error on login | `CLIENT_ORIGIN` must exactly match Vercel URL |
| API 502 / timeout | Render cold start — wait 60 s, retry |
| `prisma migrate` fails | Use `DIRECT_URL` (non-pooled) for migrations |
| Socket won't connect | Confirm API is Render/Fly, not Vercel; check `NEXT_PUBLIC_API_URL` |
| Redis `Socket closed unexpectedly` in Render logs | Set `REDIS_URL` to Upstash **TLS** URL (`rediss://...`). Copy a fresh token from Upstash console. Wrong/expired tokens fail once and fall back to single-node mode. |
| DB connection refused | Neon waking from suspend — retry after a few seconds |
| Seed fails | Run `npm run build` first, then `npm run seed:prod` |

---

## What you do manually vs what's pre-configured

### You create (accounts + paste values)

1. Neon project → copy `DATABASE_URL` + `DIRECT_URL`
2. Upstash database → copy `REDIS_URL` (optional)
3. Render Blueprint **or** Fly deploy → paste DB URLs + `CLIENT_ORIGIN`
4. Vercel project → set `NEXT_PUBLIC_API_URL`
5. Run seed once against production DB
6. Save generated JWT secrets / `ADMIN_SIGNUP_SECRET`

### Already in the repo

- `render.yaml` — Render blueprint (build, migrate, health check, env placeholders)
- `server/fly.toml` — Fly.io config with `release_command` migrations
- `server/Dockerfile` — multi-stage production image (Prisma, openssl)
- `client/Dockerfile` — Next.js standalone image
- `client/vercel.json` — Vercel build settings
- CORS + Socket.io read `CLIENT_ORIGIN` from env
- Client API + sockets use `NEXT_PUBLIC_API_URL` from env

---

## Local parity

```bash
# server/.env
CLIENT_ORIGIN=http://localhost:3000

# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5001
```

See [RUNBOOK.md](RUNBOOK.md) for local dev and [Readme.md](../Readme.md) for quick start.
