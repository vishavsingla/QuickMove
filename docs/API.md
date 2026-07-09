# QuickMove — API Contract

Base URL: `http://localhost:5001`
All request/response bodies are JSON. Authenticated endpoints require
`Authorization: Bearer <jwt>` (the token is also accepted as an `accessToken`
cookie).

## Conventions
- Success: `2xx` with a JSON payload.
- Errors: non-2xx with `{ "message": string, "error"?: string }`.
- Roles: `USER`, `DRIVER`, `ADMIN` (from the JWT payload).

## Auth — `/api/auth`
| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/register/user` | – | `{ name, email, phoneNumber, password }` | → `{ token, user, role }` |
| POST | `/register/driver` | – | `{ name, email, phoneNumber, password, licenseNumber, vehicleType, licensePlate, city, area, make?, model?, year? }` | Driver created PENDING |
| POST | `/register/admin` | – | `{ name, email, phoneNumber, password, adminSecret }` | Guarded by `ADMIN_SIGNUP_SECRET` |
| POST | `/login` | – | `{ email, password }` | → `{ token, user, role, driverId? }` |
| GET | `/me` | any | – | → `{ user, role }` |

## Geo & pricing — `/api/geo`
| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/search?q=` | – | query `q` | → `{ results: [{ displayName, lat, lng }] }` |
| POST | `/estimate` | – | `{ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType? }` | → `{ distanceKm, durationMin, surgeMultiplier, source, quotes[], selected? }` |

`quotes[]` = `{ vehicleType, fare: { base, distanceCost, timeCost, surgeMultiplier, total } }`.

## Bookings (customer) — `/api/bookings` (USER)
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ pickupLocation, pickupLat, pickupLng, dropoffLocation, dropoffLat, dropoffLng, vehicleType, scheduledTime? }` | Fare recomputed server-side; offers job to drivers |
| GET | `/` | – | Customer's bookings (newest first) |
| GET | `/:id` | – | Booking (owner, assigned driver, or admin only) |
| POST | `/:id/cancel` | – | Allowed unless COMPLETED/CANCELLED |
| POST | `/:id/rate` | `{ rating: 1..5 }` | Only on COMPLETED; updates driver rating |

## Driver — `/api/driver` (DRIVER)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/profile` | – | Driver + vehicles |
| POST | `/availability` | `{ isAvailable }` | Toggle availability |
| POST | `/location` | `{ lat, lng }` | REST fallback for location |
| GET | `/offers` | – | PENDING bookings matching vehicle type (empty until APPROVED) |
| GET | `/jobs` | – | Bookings assigned to this driver |
| POST | `/bookings/:id/accept` | – | Atomic claim; `409` if already taken |
| POST | `/bookings/:id/reject` | – | Dismisses the offer for this driver |
| POST | `/bookings/:id/status` | `{ status }` | Validated transition ARRIVED/IN_PROGRESS/COMPLETED/CANCELLED |

## Admin — `/api/admin` (ADMIN)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/drivers` | – | All drivers + vehicles + booking counts |
| POST | `/drivers/:id/status` | `{ status: APPROVED\|REJECTED\|PENDING }` | Also updates the driver's vehicles |
| GET | `/bookings` | – | Recent bookings |
| GET | `/users` | – | Customers |
| GET | `/stats` | – | `{ totals, bookingsByStatus[], bookingsByVehicle[] }` |

## Notifications — `/api/notifications` (any)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | → `{ notifications[], unread }` |
| POST | `/:id/read` | Mark one, or `all` |

## Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | → `{ status: "ok", service: "quickmove" }` |

## Socket.io events
Connect to the API origin. After connecting, the client emits `register`.

### Client → server
| Event | Payload | Purpose |
|---|---|---|
| `register` | `{ userId?, driverId? }` | Join `user:{id}` / `driver:{id}` rooms |
| `booking:join` | `{ bookingId }` | Join `booking:{id}` room |
| `booking:leave` | `{ bookingId }` | Leave the room |
| `driver:location` | `{ driverId, lat, lng, bookingId? }` | Stream live location |

### Server → client
| Event | Payload | Sent to |
|---|---|---|
| `job:new` | `{ bookingId, pickupLocation, dropoffLocation, estimatedCost, estimatedDistance, vehicleType, distanceToPickupKm }` | Matched drivers |
| `booking:update` | full booking object | Customer + booking room |
| `booking:driverLocation` | `{ bookingId, lat, lng }` | Customer + booking room |
| `notification` | notification object | Target user/driver |

## Demo credentials (after `npm run seed`)
- Admin: `admin@quickmove.dev` / `password123`
- Customer: `user@quickmove.dev` / `password123`
- Drivers: `ravi.driver@quickmove.dev` … / `password123`
