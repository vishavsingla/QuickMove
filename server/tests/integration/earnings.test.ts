import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerDriver = async () => {
  const res = await request(app).post("/api/auth/register/driver").send({
    name: "Earn Driver",
    email: `earn-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
    licenseNumber: "DL-EARN",
    vehicleType: "CAR",
    licensePlate: "KA99EARN9999",
    city: "Bangalore",
    area: "MG Road",
  });
  return {
    token: res.body.token as string,
    driverId: res.body.driver.id as string,
  };
};

const registerUser = async () => {
  const res = await request(app).post("/api/auth/register/user").send({
    name: "Payer",
    email: `payer-${Date.now()}@test.dev`,
    phoneNumber: `+92${Date.now()}`,
    password: "secret123",
  });
  return {
    token: res.body.token as string,
    userId: res.body.user.id as string,
  };
};

beforeEach(resetDb);
afterAll(disconnect);

describe("driver earnings", () => {
  it("returns empty earnings for a new driver", async () => {
    const { token } = await registerDriver();
    const res = await request(app)
      .get("/api/driver/earnings")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.balance).toBe(0);
    expect(res.body.summary.totalEarnings).toBe(0);
    expect(res.body.transactions).toEqual([]);
  });

  it("credits trip earnings after customer pays", async () => {
    const { token: driverToken, driverId } = await registerDriver();
    const { token: userToken, userId } = await registerUser();

    await request(app)
      .post("/api/payments/wallet/topup")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 1000 });

    const booking = await prisma.booking.create({
      data: {
        userId,
        driverId,
        pickupLocation: "A",
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffLocation: "B",
        dropoffLat: 12.93,
        dropoffLng: 77.62,
        vehicleType: "CAR",
        estimatedCost: 200,
        estimatedDistance: 5,
        estimatedDuration: 15,
        status: "COMPLETED",
      },
    });

    const intent = await request(app)
      .post("/api/payments/intents")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ bookingId: booking.id });
    expect(intent.status).toBe(201);

    const pay = await request(app)
      .post(`/api/payments/intents/${intent.body.intent.id}/confirm`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ method: "wallet" });
    expect(pay.status).toBe(200);

    const res = await request(app)
      .get("/api/driver/earnings")
      .set("Authorization", `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.totalEarnings).toBe(180);
    expect(res.body.summary.balance).toBe(180);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].booking.id).toBe(booking.id);
  });
});
