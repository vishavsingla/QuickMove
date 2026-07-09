jest.mock("../../src/utils/geo", () => {
  const actual = jest.requireActual("../../src/utils/geo");
  return {
    ...actual,
    routeBetween: jest.fn(async () => ({
      distanceKm: 8.5,
      durationMin: 15,
      source: "osrm" as const,
    })),
    routeThrough: jest.fn(async () => ({
      distanceKm: 14.2,
      durationMin: 28,
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
  return { token: res.body.token as string, userId: res.body.user.id as string };
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
  return {
    token: res.body.token as string,
    driverId: res.body.driver.id as string,
    userId: res.body.user.id as string,
  };
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

describe("multi-stop bookings", () => {
  it("creates a booking with waypoints and returns ordered stops", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...bookingPayload,
        stops: [
          {
            location: "Indiranagar",
            lat: 12.9784,
            lng: 77.6408,
          },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.booking.estimatedDistance).toBe(14.2);
    expect(res.body.booking.stops).toHaveLength(3);
    expect(res.body.booking.stops[0].stopType).toBe("PICKUP");
    expect(res.body.booking.stops[1].stopType).toBe("WAYPOINT");
    expect(res.body.booking.stops[2].stopType).toBe("DROP");
  });
});

describe("booking chat", () => {
  it("lets booking participants list chat messages", async () => {
    const { token: userToken, userId } = await registerUser();
    const { token: driverToken, userId: driverUserId } =
      await registerApprovedDriver();

    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);
    const bookingId = booking.body.booking.id;

    await request(app)
      .post(`/api/driver/bookings/${bookingId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    await prisma.chatMessage.create({
      data: {
        bookingId,
        senderUserId: userId,
        senderRole: "USER",
        body: "Hello driver",
      },
    });
    await prisma.chatMessage.create({
      data: {
        bookingId,
        senderUserId: driverUserId,
        senderRole: "DRIVER",
        body: "On my way",
      },
    });

    const userChat = await request(app)
      .get(`/api/bookings/${bookingId}/chat`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(userChat.status).toBe(200);
    expect(userChat.body.messages).toHaveLength(2);

    const driverChat = await request(app)
      .get(`/api/bookings/${bookingId}/chat`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(driverChat.status).toBe(200);
    expect(driverChat.body.messages[1].body).toBe("On my way");
  });

  it("forbids chat access for unrelated users", async () => {
    const { token: userToken } = await registerUser();
    const other = await request(app).post("/api/auth/register/user").send({
      name: "Other",
      email: "other@test.dev",
      phoneNumber: "+919999999999",
      password: "secret123",
    });

    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send(bookingPayload);

    const res = await request(app)
      .get(`/api/bookings/${booking.body.booking.id}/chat`)
      .set("Authorization", `Bearer ${other.body.token}`);
    expect(res.status).toBe(403);
  });
});
