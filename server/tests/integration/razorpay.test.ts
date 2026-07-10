import request from "supertest";
import crypto from "crypto";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";
import {
  MOCK_RAZORPAY_SECRET,
  computePaymentSignature,
  createMockPaymentId,
} from "../../src/services/razorpay";

const app = createApp();

const registerUser = async () => {
  const email = `rzp-${Date.now()}@test.dev`;
  const reg = await request(app).post("/api/auth/register/user").send({
    name: "Razorpay User",
    email,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
  });
  return { token: reg.body.token as string, userId: reg.body.user.id as string };
};

beforeEach(resetDb);
afterAll(disconnect);

describe("Razorpay payments (mock mode)", () => {
  it("returns mock payment config without keys", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get("/api/payments/config")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
    expect(res.body.keyId).toBeNull();
  });

  it("creates order for completed booking", async () => {
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
        estimatedCost: 250,
        estimatedDistance: 5,
        estimatedDuration: 15,
        status: "COMPLETED",
      },
    });

    const order = await request(app)
      .post("/api/payments/razorpay/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    expect(order.status).toBe(201);
    expect(order.body.mode).toBe("mock");
    expect(order.body.order.id).toMatch(/^order_mock_/);
    expect(order.body.order.amount).toBe(25000);
    expect(order.body.intentId).toBeTruthy();
  });

  it("verifies mock payment signature and marks booking paid", async () => {
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
        vehicleType: "BIKE",
        estimatedCost: 120,
        estimatedDistance: 3,
        estimatedDuration: 10,
        status: "COMPLETED",
      },
    });

    const orderRes = await request(app)
      .post("/api/payments/razorpay/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    const { order, intentId } = orderRes.body;
    const paymentId = createMockPaymentId();
    const signature = computePaymentSignature(order.id, paymentId, MOCK_RAZORPAY_SECRET);

    const verify = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ intentId, orderId: order.id, paymentId, signature });
    expect(verify.status).toBe(200);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.paymentStatus).toBe("PAID");
    expect(updated?.paymentMethod).toBe("razorpay");
  });

  it("rejects invalid payment signature", async () => {
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
        estimatedCost: 80,
        estimatedDistance: 2,
        estimatedDuration: 8,
        status: "COMPLETED",
      },
    });

    const orderRes = await request(app)
      .post("/api/payments/razorpay/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    const { order, intentId } = orderRes.body;

    const verify = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        intentId,
        orderId: order.id,
        paymentId: createMockPaymentId(),
        signature: "bad_signature",
      });
    expect(verify.status).toBe(400);
    expect(verify.body.message).toMatch(/signature/i);
  });

  it("processes webhook with valid signature", async () => {
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
        estimatedCost: 90,
        estimatedDistance: 2,
        estimatedDuration: 7,
        status: "COMPLETED",
      },
    });

    const orderRes = await request(app)
      .post("/api/payments/razorpay/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    const { order, intentId } = orderRes.body;
    const paymentId = createMockPaymentId();

    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: order.id,
            notes: { intentId },
          },
        },
      },
    });
    const webhookSig = crypto
      .createHmac("sha256", MOCK_RAZORPAY_SECRET)
      .update(payload)
      .digest("hex");

    const hook = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", webhookSig)
      .send(payload);
    expect(hook.status).toBe(200);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.paymentStatus).toBe("PAID");
  });

  it("tops up wallet via razorpay verify", async () => {
    const { token } = await registerUser();
    const orderRes = await request(app)
      .post("/api/payments/razorpay/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ topup: true, amount: 300 });
    const { order, intentId } = orderRes.body;
    const paymentId = createMockPaymentId();
    const signature = computePaymentSignature(order.id, paymentId, MOCK_RAZORPAY_SECRET);

    const verify = await request(app)
      .post("/api/payments/razorpay/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ intentId, orderId: order.id, paymentId, signature });
    expect(verify.status).toBe(200);

    const wallet = await request(app)
      .get("/api/payments/wallet")
      .set("Authorization", `Bearer ${token}`);
    expect(wallet.body.wallet.balance).toBe(300);
  });
});
