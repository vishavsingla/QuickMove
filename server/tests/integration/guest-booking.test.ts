jest.mock("../../src/utils/geo", () => {
  const actual = jest.requireActual("../../src/utils/geo");
  return {
    ...actual,
    routeBetween: jest.fn(async () => ({
      distanceKm: 250,
      durationMin: 360,
      source: "osrm" as const,
    })),
    routeThrough: jest.fn(async () => ({
      distanceKm: 250,
      durationMin: 360,
      source: "osrm" as const,
    })),
  };
});

import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const chandigarhManaliPayload = {
  pickupLocation: "Chandigarh, India",
  pickupLat: 30.7333,
  pickupLng: 76.7794,
  dropoffLocation: "Manali, Himachal Pradesh, India",
  dropoffLat: 32.2396,
  dropoffLng: 77.1887,
  vehicleType: "CAR",
};

beforeEach(resetDb);
afterAll(disconnect);

describe("guest booking flow", () => {
  it("allows fare estimate without auth", async () => {
    const res = await request(app)
      .post("/api/geo/estimate")
      .send({
        pickupLat: chandigarhManaliPayload.pickupLat,
        pickupLng: chandigarhManaliPayload.pickupLng,
        dropoffLat: chandigarhManaliPayload.dropoffLat,
        dropoffLng: chandigarhManaliPayload.dropoffLng,
      });
    expect(res.status).toBe(200);
    expect(res.body.distanceKm).toBeGreaterThan(0);
    expect(res.body.quotes.length).toBeGreaterThan(0);
  });

  it("creates a guest booking with name and phone (no JWT)", async () => {
    const res = await request(app)
      .post("/api/bookings/guest")
      .send({
        ...chandigarhManaliPayload,
        name: "Guest Rider",
        phoneNumber: "+919876543210",
      });
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("PENDING");
    expect(res.body.booking.pickupLocation).toContain("Chandigarh");
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.isNewUser).toBe(true);

    const user = await prisma.user.findUnique({
      where: { phoneNumber: "+919876543210" },
    });
    expect(user?.name).toBe("Guest Rider");
    expect(user?.email).toContain("@quickmove.local");
  });

  it("reuses existing user when phone already registered", async () => {
    await request(app).post("/api/auth/register/user").send({
      name: "Existing User",
      email: "existing@test.dev",
      phoneNumber: "+919111111111",
      password: "secret123",
    });

    const res = await request(app)
      .post("/api/bookings/guest")
      .send({
        ...chandigarhManaliPayload,
        name: "Existing User",
        phoneNumber: "+919111111111",
      });
    expect(res.status).toBe(201);
    expect(res.body.isNewUser).toBe(false);
    expect(res.body.user.email).toBe("existing@test.dev");
  });

  it("rejects guest booking without name or phone", async () => {
    const res = await request(app)
      .post("/api/bookings/guest")
      .send(chandigarhManaliPayload);
    expect(res.status).toBe(400);
  });

  it("tracks guest booking by phone + booking id", async () => {
    const created = await request(app)
      .post("/api/bookings/guest")
      .send({
        ...chandigarhManaliPayload,
        name: "Tracker",
        phoneNumber: "+919222222222",
      });
    const bookingId = created.body.booking.id;

    const track = await request(app).get(
      `/api/bookings/guest/track?bookingId=${bookingId}&phoneNumber=%2B919222222222`
    );
    expect(track.status).toBe(200);
    expect(track.body.booking.id).toBe(bookingId);

    const wrongPhone = await request(app).get(
      `/api/bookings/guest/track?bookingId=${bookingId}&phoneNumber=%2B919999999999`
    );
    expect(wrongPhone.status).toBe(403);
  });

  it("still requires auth for POST /api/bookings", async () => {
    const res = await request(app).post("/api/bookings").send(chandigarhManaliPayload);
    expect(res.status).toBe(401);
  });
});
