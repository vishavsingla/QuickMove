import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerUser = async () => {
  const res = await request(app).post("/api/auth/register/user").send({
    name: "Coupon User",
    email: `coupon-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
  });
  return { token: res.body.token as string, userId: res.body.user.id as string };
};

const seedCoupon = async () =>
  prisma.coupon.create({
    data: {
      code: "SAVE50",
      description: "Flat ₹50 off",
      discountType: "FLAT",
      discountValue: 50,
      minOrderAmount: 100,
    },
  });

beforeEach(resetDb);
afterAll(disconnect);

describe("coupons", () => {
  it("validates an active coupon", async () => {
    await seedCoupon();
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "save50", orderAmount: 200 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discount).toBe(50);
    expect(res.body.finalAmount).toBe(150);
  });

  it("rejects coupon below minimum order", async () => {
    await seedCoupon();
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/coupons/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "SAVE50", orderAmount: 50 });
    expect(res.status).toBe(400);
  });

  it("applies coupon on booking and reduces payment intent amount", async () => {
    await seedCoupon();
    const { token, userId } = await registerUser();

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
        couponCode: "SAVE50",
        discountAmount: 50,
      },
    });
    await prisma.couponRedemption.create({
      data: {
        couponId: (await prisma.coupon.findFirst())!.id,
        userId,
        bookingId: booking.id,
        discount: 50,
      },
    });

    const intent = await request(app)
      .post("/api/payments/intents")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    expect(intent.status).toBe(201);
    expect(intent.body.intent.amount).toBe(150);
  });
});
