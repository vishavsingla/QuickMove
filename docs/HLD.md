# QuickMove — High-Level Design (HLD)

## 1. Purpose
QuickMove is a real-time logistics and moving marketplace connecting customers
who need goods moved with nearby drivers (bike → big truck). The platform
provides instant fare quotes, driver matching, live GPS tracking, and
role-specific dashboards for customers, drivers, and admins.

## 2. Architecture overview

```mermaid
flowchart TB
  subgraph Clients
    WEB[Next.js Web App]
    MOB[Future: React Native]
  end

  subgraph Edge
    LB[Load Balancer / Ingress]
  end

  subgraph AppTier["Application Tier (current: monolith)"]
    API[Express REST API]
    WS[Socket.io Server]
  end

  subgraph DataTier
    PG[(PostgreSQL)]
    REDIS[(Redis)]
  end

  subgraph External
    NOM[Nominatim OSM]
    OSRM[OSRM Router]
  end

  WEB --> LB
  MOB -.-> LB
  LB --> API
  LB --> WS
  API --> PG
  WS --> PG
  WS -.-> REDIS
  API --> NOM
  API --> OSRM
```

### Current vs target
| Concern | Current (v0.3) | Target |
|---------|----------------|--------|
| API | Single Express process | Modular services behind API gateway |
| Realtime | In-process Socket.io | Redis adapter + dedicated WS pods |
| Events | Synchronous in handlers | Kafka topics for booking lifecycle |
| Search | Nominatim proxy | Self-hosted Nominatim + ES for drivers |
| Payments | Modelled, unpaid | Stripe/Razorpay test + wallet ledger |
| Observability | Console logs | OTel SDK + Prometheus + Grafana stubs |

## 3. Component responsibilities

### 3.1 Customer web (`client/`)
- Landing, auth, booking wizard, live tracking map
- Driver/admin dashboards
- JWT in localStorage, Socket.io client with room registration

### 3.2 API server (`server/`)
| Module | Routes | Responsibility |
|--------|--------|----------------|
| Auth | `/api/auth` | Register/login, JWT issuance |
| User | `/api/user` | Profile, saved addresses |
| Geo | `/api/geo` | Address search, fare estimate |
| Booking | `/api/bookings` | Create, list, cancel, rate |
| Driver | `/api/driver` | Offers, accept, status, location |
| Admin | `/api/admin` | Approvals, analytics |
| Notifications | `/api/notifications` | In-app notification feed |

### 3.3 Realtime layer (`socket.ts`)
- Rooms: `user:{id}`, `driver:{id}`, `booking:{id}`
- Events: `job:new`, `booking:update`, `booking:driverLocation`, `notification`
- Target: Redis pub/sub via `@socket.io/redis-adapter` for horizontal scale

### 3.4 Pricing engine (`utils/pricing.ts`)
```
fare = max(minFare, (base + km×rate + min×timeRate) × surge)
```
- Per-vehicle rate table (BIKE → BIG_TRUCK)
- Surge: 1.25× during peak hours (8–11, 17–21)
- Target: demand/supply ratio, city config, coupons, taxes

### 3.5 Matching (`services/matching.ts`)
1. Filter: APPROVED + available + matching `vehicleType`
2. Rank by haversine distance to pickup
3. Notify each driver (DB + `job:new` socket)
4. First atomic accept wins (`updateMany` conditional)

## 4. Data model (ER)

```mermaid
erDiagram
  User ||--o| Driver : "is"
  User ||--o| Admin : "is"
  User ||--o{ Booking : "creates"
  User ||--o{ SavedAddress : "has"
  User ||--o{ Notification : "receives"
  Driver ||--o{ Vehicle : "owns"
  Driver ||--o{ Booking : "fulfills"
  Driver ||--o{ Notification : "receives"
  Booking ||--o{ Notification : "triggers"

  User {
    string id PK
    string email UK
    string phoneNumber UK
    enum role
  }
  Driver {
    string id PK
    string userId FK
    enum vehicleType
    string status
    float currentLat
    float currentLng
  }
  Booking {
    string id PK
    enum status
    enum vehicleType
    float estimatedCost
    float pickupLat
    float pickupLng
  }
  SavedAddress {
    string id PK
    string userId FK
    string label
    float lat
    float lng
  }
```

## 5. Sequence diagrams

### 5.1 User signup & login

```mermaid
sequenceDiagram
  actor U as Customer
  participant C as Next.js Client
  participant A as Auth API
  participant DB as PostgreSQL

  U->>C: Fill signup form
  C->>A: POST /api/auth/register/user
  A->>DB: Create User (bcrypt password)
  A-->>C: { token, user, role }
  C->>C: Store JWT in localStorage

  Note over U,C: Login flow
  U->>C: Enter credentials
  C->>A: POST /api/auth/login
  A->>DB: Find user, verify bcrypt
  A-->>C: { token, user, role, driverId? }
```

### 5.2 Booking create → estimate → driver offer

```mermaid
sequenceDiagram
  actor U as Customer
  participant C as Client
  participant G as Geo API
  participant B as Booking API
  participant M as Matching Service
  participant OSRM as OSRM
  participant DB as PostgreSQL
  participant WS as Socket.io
  actor D as Driver

  U->>C: Select pickup & dropoff
  C->>G: POST /api/geo/estimate
  G->>OSRM: Route distance/duration
  G-->>C: quotes per vehicle type

  U->>C: Confirm booking (CAR)
  C->>B: POST /api/bookings
  B->>G: Recompute route + fare
  B->>DB: Insert Booking (PENDING)
  B->>M: offerBookingToDrivers(id)
  M->>DB: Find nearby APPROVED drivers
  loop Each driver
    M->>DB: Create Notification
    M->>WS: emit job:new → driver:{id}
  end
  WS-->>D: New job offer
  B-->>C: { booking }
```

### 5.3 Driver accept → live tracking → completion

```mermaid
sequenceDiagram
  actor D as Driver
  participant C as Driver Client
  participant API as Driver API
  participant DB as PostgreSQL
  participant WS as Socket.io
  actor U as Customer

  D->>C: Accept job
  C->>API: POST /driver/bookings/:id/accept
  API->>DB: updateMany WHERE PENDING (atomic)
  API->>DB: Create notification
  API->>WS: booking:update → user + booking room
  WS-->>U: Driver assigned

  loop Every 2s during active job
    D->>C: GPS position
    C->>WS: driver:location { lat, lng, bookingId }
    WS->>DB: Update driver + booking coords
    WS-->>U: booking:driverLocation
  end

  D->>C: Mark ARRIVED → IN_PROGRESS → COMPLETED
  C->>API: POST /driver/bookings/:id/status
  API->>DB: Validate state machine transition
  API->>WS: booking:update
  WS-->>U: Status timeline update

  U->>C: Rate 5 stars
  C->>API: POST /bookings/:id/rate
  API->>DB: Update booking.rating, driver.rating avg
```

### 5.4 Admin driver approval

```mermaid
sequenceDiagram
  actor A as Admin
  participant C as Admin Client
  participant API as Admin API
  participant DB as PostgreSQL
  participant WS as Socket.io
  actor D as Driver

  A->>C: View pending drivers
  C->>API: GET /api/admin/drivers
  API-->>C: drivers list

  A->>C: Approve driver
  C->>API: POST /admin/drivers/:id/status { APPROVED }
  API->>DB: Update driver + vehicles status
  API->>DB: Create notification
  API->>WS: notification → driver:{id}
  WS-->>D: Account approved
```

### 5.5 Cancellation

```mermaid
sequenceDiagram
  actor U as Customer
  participant C as Client
  participant API as Booking API
  participant DB as PostgreSQL
  participant WS as Socket.io
  actor D as Driver

  U->>C: Cancel booking
  C->>API: POST /bookings/:id/cancel
  API->>DB: status = CANCELLED
  alt Driver was assigned
    API->>DB: Notify driver
    API->>WS: booking:update
    WS-->>D: Booking cancelled
  end
  API-->>C: { booking: CANCELLED }
```

## 6. Deployment architecture

```mermaid
flowchart LR
  subgraph K8s Cluster
    ING[Ingress]
    SVC_API[Service: api]
    SVC_WEB[Service: web]
    POD_API[Deployment: server x N]
    POD_WEB[Deployment: client x N]
    STS_PG[StatefulSet: postgres]
    STS_REDIS[StatefulSet: redis]
  end
  ING --> SVC_WEB
  ING --> SVC_API
  SVC_WEB --> POD_WEB
  SVC_API --> POD_API
  POD_API --> STS_PG
  POD_API --> STS_REDIS
```

Local development uses root `docker-compose.yml` (postgres + redis + server + client).

## 7. Scaling considerations
- **API**: Stateless; scale horizontally behind load balancer
- **WebSocket**: Requires sticky sessions or Redis adapter for multi-pod
- **Postgres**: Read replicas for analytics; connection pooling via PgBouncer
- **Geo**: Rate-limit Nominatim (1 req/s); cache geocode results in Redis
- **Matching**: Future: geospatial index (PostGIS) instead of haversine scan

## 8. Failure recovery
- OSRM/Nominatim down → haversine fallback (pricing still works)
- Socket disconnect → client auto-reconnects; REST remains source of truth
- Double accept → atomic `updateMany` returns 409 for loser
- DB migration → `prisma migrate deploy` in container startup

## 9. Security
- JWT Bearer auth with role guards
- bcrypt password hashing (cost 10)
- CORS locked to `CLIENT_ORIGIN`
- Target: refresh tokens, rate limiting, audit log table, OWASP headers

## 10. Observability (target)
- OpenTelemetry traces on all API routes
- Prometheus metrics: `booking_created_total`, `driver_accept_latency`, `ws_connections`
- Structured JSON logging with correlation IDs
