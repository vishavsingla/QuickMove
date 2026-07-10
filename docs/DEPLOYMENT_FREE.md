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
| `CLIENT_ORIGIN` | Your Vercel production URL (set after Step 4), e.g. `https://quickmove.vercel.app` — **no trailing slash** |
| `CORS_ORIGINS` | Optional. Comma-separated list if you need localhost + production + Vercel previews, e.g. `http://localhost:3000,https://quickmove.vercel.app,https://*.vercel.app` |

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

Go back to Render (or Fly) and set **one** of:

```
CLIENT_ORIGIN=https://quickmove.vercel.app
```

Must match your Vercel **production** URL exactly (scheme + host, **no trailing slash**). Redeploy after changing.

For Vercel preview deployments too, set `CORS_ORIGINS` instead (comma-separated, no spaces required):

```
CORS_ORIGINS=http://localhost:3000,https://quickmove.vercel.app,https://*.vercel.app
```

`CORS_ORIGINS` overrides `CLIENT_ORIGIN` when set. Wildcards like `https://*.vercel.app` match preview URLs.

Both Express CORS and Socket.io read origins from env. Preflight `OPTIONS` requests are handled automatically.

---

## Step 6 — Razorpay test checkout (optional, free)

QuickMove is an **INR** app. **Razorpay** is the supported payment gateway (test mode is free; no Stripe integration in this repo).

**Without keys (default):** the app uses a built-in **mock checkout** — fine for demos, zero signup.

**With Razorpay test keys:** the frontend opens the real Razorpay test modal (`checkout.razorpay.com`). Still **no real money** — only test cards/UPI.

### 6a — Create a free Razorpay test account

1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com) (free).
2. Stay in **Test mode** (toggle in the top bar — keys start with `rzp_test_`).
3. Go to **Account & Settings → API Keys** → **Generate Key**.
4. Copy **Key Id** (`rzp_test_…`) and **Key Secret** (shown once).

### 6b — Set keys on Render

Render Dashboard → `quickmove-api` → **Environment** → add:

| Variable | Value |
|----------|-------|
| `RAZORPAY_KEY_ID` | `rzp_test_xxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | your test secret |

Redeploy the API. The Wallet page badge switches from **Test mode (mock)** to **Razorpay test checkout**.

For local dev, add the same vars to `server/.env` (see `server/.env.example`).

### 6c — Webhook (optional, for async payment events)

In Razorpay Dashboard → **Developers → Webhooks** → **Add New Webhook**:

| Field | Value |
|-------|-------|
| URL | `https://quickmove-api.onrender.com/api/payments/webhook` |
| Events | `payment.captured` (and optionally `payment.failed`) |
| Secret | Use your **test** Key Secret (QuickMove verifies `X-Razorpay-Signature` with the same secret) |

Replace the host if your API is on Fly.io or another domain. Webhooks are optional — the app verifies payments synchronously via `POST /api/payments/razorpay/verify` after checkout.

### 6d — Test a payment

1. Open Wallet on your Vercel URL — confirm the badge says **Razorpay test checkout**.
2. Click **Add via Razorpay test** — the real Razorpay modal opens.
3. Use Razorpay [test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/) (e.g. card `4111 1111 1111 1111`, any future expiry, CVV `123`).
4. Complete a trip payment from a completed booking the same way.

**Stripe:** not implemented. For INR, use Razorpay. Stripe would be a separate feature (different currency flow, webhooks, and checkout SDK).

**Verify CORS from your machine:**

```bash
curl -i -X OPTIONS "https://quickmove-api.onrender.com/api/auth/register/user" \
  -H "Origin: https://quickmove.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expect `200`, `Access-Control-Allow-Origin: https://quickmove.vercel.app`, and `Access-Control-Allow-Credentials: true`.

---

## Step 7 — Seed the production database (once)

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
| `CLIENT_ORIGIN` | Yes | Vercel production frontend URL (no trailing slash) |
| `CORS_ORIGINS` | No | Comma-separated origins; overrides `CLIENT_ORIGIN` when set |
| `ADMIN_SIGNUP_SECRET` | Yes | Protects admin registration |
| `REDIS_URL` | No | Upstash **TLS** URL: `rediss://default:<token>@<host>.upstash.io:6379` — copy from Upstash console (TLS enabled). Omit for single-node sockets. |
| `RAZORPAY_KEY_ID` | No | Razorpay **test** key (`rzp_test_…`). Omit for built-in mock checkout. |
| `RAZORPAY_KEY_SECRET` | No | Razorpay **test** secret. Must be set together with `RAZORPAY_KEY_ID`. |
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
- [ ] Wallet badge: **Test mode (mock)** without keys, or **Razorpay test checkout** after setting `RAZORPAY_KEY_*` on the API

**Socket debug:** In browser console, no CORS errors to API origin. WS URL should be your `NEXT_PUBLIC_API_URL`, not `localhost:5001`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error on login/register | Set `CLIENT_ORIGIN` to your exact Vercel URL (no trailing slash), or use `CORS_ORIGINS` with `https://*.vercel.app` for previews |
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
7. (Optional) Razorpay test keys + webhook URL for real test checkout

### Already in the repo

- `render.yaml` — Render blueprint (build, migrate, health check, env placeholders)
- `server/fly.toml` — Fly.io config with `release_command` migrations
- `server/Dockerfile` — multi-stage production image (Prisma, openssl)
- `client/Dockerfile` — Next.js standalone image
- `client/vercel.json` — Vercel build settings
- CORS + Socket.io read `CLIENT_ORIGIN` / `CORS_ORIGINS` from env
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
