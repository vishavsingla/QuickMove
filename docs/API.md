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
| POST | `/login` | – | `{ email, password }` | → `{ token, refreshToken, user, role, driverId? }` |
| POST | `/refresh` | – | `{ refreshToken }` | → `{ token, refreshToken, role, driverId? }` — rotates refresh token |
| POST | `/logout` | – | `{ refreshToken? }` | Revokes session |
| GET | `/me` | any | – | → `{ user, role }` |

## Geo & pricing — `/api/geo`
| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/search?q=` | – | query `q` | → `{ results: [{ displayName, lat, lng }] }` |
| POST | `/estimate` | – | `{ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType?, stops?: [{ lat, lng }] }` | Multi-leg route when `stops` provided |

`quotes[]` = `{ vehicleType, fare: { base, distanceCost, timeCost, surgeMultiplier, total } }`.

## Bookings (customer) — `/api/bookings` (USER)
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ pickupLocation, pickupLat, pickupLng, dropoffLocation, dropoffLat, dropoffLng, vehicleType, scheduledTime?, stops?: [{ location, lat, lng }] }` | Fare recomputed server-side; creates `BookingStop` rows when `stops` set |
| GET | `/` | – | Customer's bookings (newest first) |
| GET | `/:id` | – | Booking with `stops[]` (owner, assigned driver, or admin only) |
| GET | `/:id/invoice` | – | Tax invoice JSON + HTML (`?format=html` for raw HTML) |
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
| GET | `/earnings` | – | → `{ summary, transactions[] }` |
| GET | `/payouts` | – | Bank withdrawal history |
| POST | `/bank` | `{ bankAccNo, ifscCode }` | Save payout bank details |
| POST | `/withdraw` | `{ amount }` | Instant stub bank payout (min ₹100) |
| GET | `/kyc` | – | KYC status + document URLs |
| POST | `/kyc/submit` | `{ licenseFileName, idFileName }` | Upload stubs → `SUBMITTED` |
| POST | `/bookings/:id/accept` | – | Atomic claim; `409` if already taken |
| POST | `/bookings/:id/reject` | – | Dismisses the offer for this driver |
| POST | `/bookings/:id/status` | `{ status }` | Validated transition ARRIVED/IN_PROGRESS/COMPLETED/CANCELLED |

## Admin — `/api/admin` (ADMIN)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/drivers` | – | All drivers + vehicles + booking counts |
| POST | `/drivers/:id/status` | `{ status: APPROVED\|REJECTED\|PENDING }` | Also updates the driver's vehicles |
| POST | `/drivers/:id/kyc` | `{ status: VERIFIED\|REJECTED, note? }` | Review driver KYC |
| GET | `/drivers/locations` | – | Online drivers with `currentLat`/`currentLng` |
| GET | `/pricing-rules` | – | Per-vehicle fare rules |
| PUT | `/pricing-rules` | `{ vehicleType, base, perKm, perMin, minFare, peakSurge }` | Upsert pricing rule |
| GET | `/bookings` | – | Recent bookings |
| GET | `/users` | – | Customers |
| GET | `/stats` | – | `{ totals, bookingsByStatus[], bookingsByVehicle[] }` |
| GET | `/coupons` | – | List all coupons |
| POST | `/coupons` | `{ code, discountType, discountValue, minOrderAmount?, maxDiscount?, usageLimit?, validUntil? }` | Create coupon |
| POST | `/coupons/:id/toggle` | – | Enable/disable coupon |

## Coupons — `/api/coupons` (USER)
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/validate` | `{ code, orderAmount }` | → `{ valid, discount, finalAmount }` |

Bookings accept optional `couponCode` on `POST /api/bookings`. Payment intents charge `estimatedCost - discountAmount`.

## Payments — `/api/payments` (USER)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/wallet` | – | → `{ wallet, transactions[] }` |
| POST | `/wallet/topup` | `{ amount }` | Test-mode instant credit |
| POST | `/intents` | `{ bookingId }` | Create payment intent for completed booking |
| POST | `/intents/:id/confirm` | `{ method: wallet\|test_card, token? }` | On success credits driver wallet 90% of fare |

## Chat — `/api/bookings/:id/chat` (USER, DRIVER on assigned booking)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Message history for booking |

## Notifications — `/api/notifications` (any)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | – | → `{ notifications[], unread }` |
| GET | `/push/status` | – | → `{ enabled, subscriptions }` |
| POST | `/push/subscribe` | `{ endpoint, keys? }` | Save web push stub subscription |
| POST | `/push/unsubscribe` | `{ endpoint }` | Remove subscription |
| POST | `/:id/read` | – | Mark one, or `all` |

## Health & metrics
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | → `{ status: "ok", service: "quickmove" }` |
| GET | `/metrics` | Prometheus text format (HTTP, booking, payment counters) |

## Socket.io events
Connect to the API origin. After connecting, the client emits `register`.

### Client → server
| Event | Payload | Purpose |
|---|---|---|
| `register` | `{ userId?, driverId?, isAdmin? }` | Join `user:{id}` / `driver:{id}` / `admin:live` rooms |
| `booking:join` | `{ bookingId }` | Join `booking:{id}` room |
| `booking:leave` | `{ bookingId }` | Leave the room |
| `driver:location` | `{ driverId, lat, lng, bookingId? }` | Stream live location |
| `chat:send` | `{ bookingId, senderUserId, senderRole, body }` | Persist + broadcast chat message |
| `chat:typing` | `{ bookingId, userId, isTyping }` | Typing indicator to booking room |

### Server → client
| Event | Payload | Sent to |
|---|---|---|
| `job:new` | `{ bookingId, pickupLocation, dropoffLocation, estimatedCost, estimatedDistance, vehicleType, distanceToPickupKm }` | Matched drivers |
| `booking:update` | full booking object | Customer + booking room |
| `booking:driverLocation` | `{ bookingId, lat, lng }` | Customer + booking room |
| `admin:driverLocation` | driver + lat/lng | `admin:live` room |
| `chat:message` | chat message object | Booking room |
| `chat:typing` | `{ bookingId, userId, isTyping }` | Booking room (except sender) |
| `notification` | notification object | Target user/driver |

## Demo credentials (after `npm run seed`)
- Admin: `admin@quickmove.dev` / `password123`
- Customer: `user@quickmove.dev` / `password123`
- Drivers: `ravi.driver@quickmove.dev` … / `password123`
