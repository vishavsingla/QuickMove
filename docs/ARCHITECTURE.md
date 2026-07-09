# QuickMove — Architecture

## System overview

```
┌──────────────┐        HTTPS/REST        ┌───────────────────────┐
│  Next.js     │  ───────────────────────▶│  Express API (TS)     │
│  client      │◀───────────────────────  │  - auth / bookings    │
│  (user /     │        JSON              │  - driver / admin     │
│   driver /   │                          │  - geo / notifications│
│   admin)     │        WebSocket         │                       │
│              │◀────────────────────────▶│  Socket.io            │
└──────────────┘   location / status /    └──────────┬────────────┘
                   notifications                     │ Prisma
                                                     ▼
                                          ┌───────────────────────┐
                                          │  PostgreSQL            │
                                          └───────────────────────┘

        External (no API key): Nominatim (geocode), OSRM (routing)
        Fallback: haversine distance + average-speed ETA
```

## Backend layout (`server/src`)
- `app.ts` — builds the Express app (routers, CORS, health, error handler). Pure
  function so tests can import it without opening a port.
- `index.ts` — HTTP server + Socket.io bootstrap.
- `socket.ts` — Socket.io setup, rooms, driver-location handler.
- `config/env.ts` — typed environment configuration.
- `lib/prisma.ts` — Prisma client singleton.
- `middlewares/auth.ts` — `requireAuth`, `requireRole`.
- `utils/` — `jwt`, `geo` (haversine/OSRM/Nominatim), `pricing`.
- `controllers/` — `auth`, `geo`, `booking`, `driver`, `admin`, `notification`.
- `routers/` — one router per domain, mounted under `/api/*`.
- `services/` — `matching` (offer jobs to drivers), `notifications`, `realtime`.
- `prisma/` — schema, migrations, and the demo seed.

## Data model (Prisma)
- **User** `{ id, name, email, phoneNumber, hashedPassword, role }` — 1:1 with
  Driver or Admin; 1:N bookings and notifications.
- **Driver** `{ userId, name, email, phoneNumber, licenseNumber, vehicleType,
  licensePlate, city, area, isAvailable, status(PENDING|APPROVED|REJECTED),
  currentLat, currentLng, rating, totalTrips }` — 1:N vehicles, bookings.
- **Vehicle** `{ driverId, make, model, year, licensePlate, vehicleType, status }`.
- **Admin** `{ userId }`.
- **Booking** `{ userId, driverId?, pickup*, dropoff*, vehicleType,
  estimatedDistance, estimatedDuration, estimatedCost, status, paymentStatus,
  driverLat?, driverLng?, rating?, scheduledTime? }`.
- **Notification** `{ type, message, userId?, driverId?, bookingId?, isRead }`.
- **Session** `{ sessionToken, accessToken?, refreshToken?, expires, userId }`.

### Enums
- `Role`: USER | DRIVER | ADMIN
- `VehicleType`: BIKE | CAR | BIG_CAR | TEMPO | SMALL_TRUCK | BIG_TRUCK
- `BookingStatus`: PENDING | ACCEPTED | ARRIVED | IN_PROGRESS | COMPLETED |
  REJECTED | CANCELLED

## Booking state machine
```
PENDING ──accept──▶ ACCEPTED ──▶ ARRIVED ──▶ IN_PROGRESS ──▶ COMPLETED
   │                   │             │
   └── cancel ─────────┴─────────────┴──▶ CANCELLED
   └── (no matching accept) ─────────────▶ stays PENDING / REJECTED
```
- Customer may cancel while not COMPLETED/CANCELLED.
- Driver status transitions are validated server-side (no illegal jumps).
- COMPLETED increments the driver's trip count and frees availability.

## Frontend layout (`client`)
- Next.js App Router with role areas: `user`, `driver`, `admin`, plus `auth`.
- A typed API client wraps REST calls and injects the JWT.
- A socket provider connects on login and registers the user/driver rooms.
- Leaflet renders maps and live markers (no Google key needed).

## Deployment
- Dockerfiles for client and server (multi-stage).
- docker-compose for the full local stack (Postgres + server + client).
- GitHub Actions: lint + typecheck + build + unit + integration (+ e2e) with a
  Postgres service; image build/push; deploy stub.
- Kubernetes manifests under `deploy/k8s` (Deployments, Services, Ingress,
  ConfigMap/Secret templates, Postgres StatefulSet).
