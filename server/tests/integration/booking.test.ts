jest.mock("../../src/utils/geo", () => {
  const actual = jest.requireActual("../../src/utils/geo");
  return {
    ...actual,
    routeBetween: jest.fn(async () => ({
      distanceKm: 8.5,
      durationMin: 15,
      source: "osrm" as const,
    })),
    geocode: jest.fn(async () => [
      { displayName: "Test Place", lat: 12.97, lng: 77.59 },
    ]),
  };
});

import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerUser = async () => {
  const res = await request(app).post("/api/auth/register/user").send({
    name: "Cust",
    email: "cust@test.dev",
    phoneNumber: "+911111111111",
    password: "secret123",
  });
  return res.body.token as string;
};

const registerApprovedDriver = async (
  email = "drv@test.dev",
  phone = "+912222222222",
  vehicleType = "CAR"
) => {
  const res = await request(app).post("/api/auth/register/driver").send({
    name: "Drv",
    email,
    phoneNumber: phone,
    password: "secret123",
    licenseNumber: "DL-9",
    vehicleType,
    licensePlate: "KA09ZZ9999",
    city: "Bangalore",
    area: "MG Road",
  });
  await prisma.driver.update({
    where: { id: res.body.driver.id },
    data: { status: "APPROVED", currentLat: 12.98, currentLng: 77.6 },
  });
  return { token: res.body.token as string, driverId: res.body.driver.id as string };
};

const bookingPayload = {
  pickupLocation: "MG Road",
  pickupLat: 12.9716,
  pickupLng: 77.5946,
  dropoffLocation: "Koramangala",
  dropoffLat: 12.9352,
  dropoffLng: 77.6245,
  vehicleType: "CAR",
};

beforeEach(resetDb);
afterAll(disconnect);

describe("booking lifecycle", () => {
  it("creates a booking with a server-computed fare", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send(bookingPayload);
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("PENDING");
    expect(res.body.booking.estimatedDistance).toBe(8.5);
    expect(res.body.booking.estimatedCost).toBeGreaterThan(0);
  });

  it("rejects booking creation without auth", async () => {
    const res = await request(app).post("/api/bookings").send(bookingPayload);
    expect(res.status).toBe(401);
  });

  it("rejects invalid vehicle type", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...bookingPayload, vehicleType: "SPACESHIP" });
    expect(res.status).toBe(400);
  });

  it("lets a driver see and accept a matching offer", async () => {
    const userToken = await registerUser();
    const { token: driverToken } = await registerApprovedDriver();

    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const bookingId = booking.body.booking.id;

    const offers = await request(app)
      .get("/api/driver/offers")
      .set("Authorization", `Bearer ${driverToken}`);
    expect(offers.body.offers.map((o: any) => o.id)).toContain(bookingId);

    const accept = await request(app)
      .post(`/api/driver/bookings/${bookingId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(accept.status).toBe(200);
    expect(accept.body.booking.status).toBe("ACCEPTED");
  });

  it("prevents a second driver from accepting the same booking", async () => {
    const userToken = await registerUser();
    const d1 = await registerApprovedDriver("d1@test.dev", "+913333333331");
    const d2 = await registerApprovedDriver("d2@test.dev", "+913333333332");

    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const id = booking.body.booking.id;

    const first = await request(app)
      .post(`/api/driver/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${d1.token}`);
    const second = await request(app)
      .post(`/api/driver/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${d2.token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it("walks status ACCEPTED -> ARRIVED -> IN_PROGRESS -> COMPLETED and blocks invalid jumps", async () => {
    const userToken = await registerUser();
    const { token: driverToken } = await registerApprovedDriver();
    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const id = booking.body.booking.id;
    await request(app)
      .post(`/api/driver/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    const invalid = await request(app)
      .post(`/api/driver/bookings/${id}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "COMPLETED" });
    expect(invalid.status).toBe(400);

    for (const status of ["ARRIVED", "IN_PROGRESS", "COMPLETED"]) {
      const r = await request(app)
        .post(`/api/driver/bookings/${id}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status });
      expect(r.status).toBe(200);
      expect(r.body.booking.status).toBe(status);
    }
  });

  it("lets the user cancel and then rate a completed booking", async () => {
    const userToken = await registerUser();

    // cancel flow
    const b1 = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const cancel = await request(app)
      .post(`/api/bookings/${b1.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.booking.status).toBe("CANCELLED");

    // rate flow on a completed booking
    const { token: driverToken, driverId } = await registerApprovedDriver();
    const b2 = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const id = b2.body.booking.id;
    await request(app)
      .post(`/api/driver/bookings/${id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);
    for (const status of ["ARRIVED", "IN_PROGRESS", "COMPLETED"]) {
      await request(app)
        .post(`/api/driver/bookings/${id}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status });
    }
    const rate = await request(app)
      .post(`/api/bookings/${id}/rate`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ rating: 5 });
    expect(rate.status).toBe(200);

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    expect(driver?.rating).toBe(5);
    expect(driver?.totalTrips).toBe(1);
  });
});
