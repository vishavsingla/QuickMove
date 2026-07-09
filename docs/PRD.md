# QuickMove — Product Requirements Document

## Overview
QuickMove is a real-time logistics and moving platform that connects customers
who need to move goods with nearby drivers operating different vehicle types
(from bikes to big trucks). It provides live vehicle tracking, dynamic price
estimation, and driver–customer coordination over a WebSocket layer.

## Goals
- Let a customer get an instant, transparent fare estimate and book a move.
- Match bookings to the most suitable nearby, available, approved drivers.
- Give live status and location updates to the customer during a move.
- Let drivers manage availability, accept jobs, and progress a move to
  completion.
- Give admins the tools to approve drivers and monitor the marketplace.
- Run entirely on free/open services (no paid API keys required).

## Personas
- **Customer (USER):** books moves, tracks them live, rates the driver.
- **Driver (DRIVER):** registers a vehicle, awaits approval, toggles
  availability, accepts jobs, updates job status, streams location.
- **Admin (ADMIN):** approves/rejects drivers, views bookings/users, sees
  marketplace analytics.

## Core user journeys
1. **Customer books a move**
   - Enter pickup + drop-off (address search / map).
   - See distance, ETA, and a fare per vehicle type (dynamic pricing + surge).
   - Confirm booking → nearby matching drivers are offered the job.
   - Watch driver accept, arrive, start, and complete the move live.
   - Rate the driver afterwards.
2. **Driver fulfils a job**
   - Register (vehicle details) → PENDING until an admin approves.
   - Once APPROVED, toggle availability and see matching job offers.
   - Accept a job (first to accept wins), then move through
     ARRIVED → IN_PROGRESS → COMPLETED, streaming location throughout.
3. **Admin operates the marketplace**
   - Review pending drivers and approve/reject them.
   - Browse bookings and customers.
   - View totals, revenue, and breakdowns by status and vehicle type.

## Functional requirements
- Role-based auth (USER/DRIVER/ADMIN) with JWT.
- Fare estimation endpoint returning per-vehicle quotes + distance/ETA.
- Booking lifecycle: PENDING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED,
  plus CANCELLED and REJECTED.
- Driver matching by vehicle type + proximity + availability + approval.
- Atomic job acceptance (no double-assignment).
- Realtime: live driver location, booking status updates, notifications.
- Admin approvals and analytics.

## Non-functional requirements
- No paid API keys: OSRM (routing) + Nominatim (geocoding) with a haversine
  fallback so the platform still works offline/rate-limited.
- Automated tests (unit, integration, e2e) and green CI required to merge.
- Containerized and deployable (Docker, docker-compose, Kubernetes).

## Out of scope (for now)
- Real payment gateway (payment is modelled but mocked as UNPAID/PAID).
- SMS/email notifications (in-app + socket notifications only).
- Multi-city routing optimization / batching.
