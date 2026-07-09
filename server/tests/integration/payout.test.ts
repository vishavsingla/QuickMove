import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerDriver = async () => {
  const res = await request(app).post("/api/auth/register/driver").send({
    name: "Payout Driver",
    email: `payout-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
    licenseNumber: "DL-PAY",
    vehicleType: "CAR",
    licensePlate: "KA99PAY9999",
    city: "Bangalore",
    area: "MG Road",
  });
  return {
    token: res.body.token as string,
    driverId: res.body.driver.id as string,
    userId: res.body.user.id as string,
  };
};

beforeEach(resetDb);
afterAll(disconnect);

describe("driver payout withdrawal", () => {
  it("rejects withdrawal without bank details", async () => {
    const { token, userId } = await registerDriver();
    await prisma.wallet.create({ data: { userId, balance: 500 } });

    const res = await request(app)
      .post("/api/driver/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 200 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bank details/i);
  });

  it("withdraws to bank and debits wallet", async () => {
    const { token, userId } = await registerDriver();

    await request(app)
      .post("/api/driver/bank")
      .set("Authorization", `Bearer ${token}`)
      .send({ bankAccNo: "1234567890", ifscCode: "HDFC0001234" });

    await prisma.wallet.create({ data: { userId, balance: 500 } });

    const withdraw = await request(app)
      .post("/api/driver/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 200 });
    expect(withdraw.status).toBe(200);
    expect(withdraw.body.payout.amount).toBe(200);
    expect(withdraw.body.payout.status).toBe("COMPLETED");

    const earnings = await request(app)
      .get("/api/driver/earnings")
      .set("Authorization", `Bearer ${token}`);
    expect(earnings.body.summary.balance).toBe(300);

    const payouts = await request(app)
      .get("/api/driver/payouts")
      .set("Authorization", `Bearer ${token}`);
    expect(payouts.body.payouts).toHaveLength(1);
    expect(payouts.body.payouts[0].description).toBe("Bank withdrawal");
  });

  it("enforces minimum withdrawal amount", async () => {
    const { token, userId } = await registerDriver();
    await request(app)
      .post("/api/driver/bank")
      .set("Authorization", `Bearer ${token}`)
      .send({ bankAccNo: "1234567890", ifscCode: "HDFC0001234" });
    await prisma.wallet.create({ data: { userId, balance: 500 } });

    const res = await request(app)
      .post("/api/driver/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 50 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Minimum withdrawal/i);
  });
});
