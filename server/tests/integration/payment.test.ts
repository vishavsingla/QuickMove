import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerAndLogin = async () => {
  const email = `pay-${Date.now()}@test.dev`;
  const reg = await request(app).post("/api/auth/register/user").send({
    name: "Payer",
    email,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
  });
  return reg.body.token as string;
};

beforeEach(resetDb);
afterAll(disconnect);

describe("payments & wallet", () => {
  it("tops up wallet in test mode", async () => {
    const token = await registerAndLogin();
    const top = await request(app)
      .post("/api/payments/wallet/topup")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500 });
    expect(top.status).toBe(200);
    expect(top.body.wallet.balance).toBe(500);

    const bal = await request(app)
      .get("/api/payments/wallet")
      .set("Authorization", `Bearer ${token}`);
    expect(bal.body.transactions.length).toBeGreaterThan(0);
  });

  it("pays for a completed booking via wallet", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Payer",
      email: `pay2-${Date.now()}@test.dev`,
      phoneNumber: `+92${Date.now()}`,
      password: "secret123",
    });
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;

    await request(app)
      .post("/api/payments/wallet/topup")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000 });

    const booking = await prisma.booking.create({
      data: {
        userId,
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
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    expect(intent.status).toBe(201);

    const pay = await request(app)
      .post(`/api/payments/intents/${intent.body.intent.id}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "wallet" });
    expect(pay.status).toBe(200);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.paymentStatus).toBe("PAID");
  });

  it("declines test card when token is test_fail", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Payer",
      email: `pay3-${Date.now()}@test.dev`,
      phoneNumber: `+93${Date.now()}`,
      password: "secret123",
    });
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;
    const booking = await prisma.booking.create({
      data: {
        userId,
        pickupLocation: "A",
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffLocation: "B",
        dropoffLat: 12.93,
        dropoffLng: 77.62,
        vehicleType: "BIKE",
        estimatedCost: 50,
        estimatedDistance: 2,
        estimatedDuration: 8,
        status: "COMPLETED",
      },
    });
    const intent = await request(app)
      .post("/api/payments/intents")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    const fail = await request(app)
      .post(`/api/payments/intents/${intent.body.intent.id}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ method: "test_card", token: "test_fail" });
    expect(fail.status).toBe(400);
  });
});
