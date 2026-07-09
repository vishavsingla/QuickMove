import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

beforeEach(resetDb);
afterAll(disconnect);

describe("invoices", () => {
  it("generates an invoice for a paid booking", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Inv User",
      email: `inv-${Date.now()}@test.dev`,
      phoneNumber: `+91${Date.now()}`,
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
        vehicleType: "CAR",
        estimatedCost: 300,
        discountAmount: 50,
        couponCode: "SAVE50",
        estimatedDistance: 5,
        estimatedDuration: 15,
        status: "COMPLETED",
        paymentStatus: "PAID",
        paymentMethod: "wallet",
      },
    });

    const res = await request(app)
      .get(`/api/bookings/${booking.id}/invoice`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.invoice.invoiceNumber).toMatch(/^QMV-/);
    expect(res.body.invoice.total).toBe(250);
    expect(res.body.html).toContain("QuickMove Tax Invoice");
  });

  it("rejects invoice for unpaid booking", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Unpaid",
      email: `unpaid-${Date.now()}@test.dev`,
      phoneNumber: `+92${Date.now()}`,
      password: "secret123",
    });
    const booking = await prisma.booking.create({
      data: {
        userId: reg.body.user.id,
        pickupLocation: "A",
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffLocation: "B",
        dropoffLat: 12.93,
        dropoffLng: 77.62,
        vehicleType: "CAR",
        estimatedCost: 100,
        estimatedDistance: 2,
        estimatedDuration: 8,
        status: "COMPLETED",
      },
    });
    const res = await request(app)
      .get(`/api/bookings/${booking.id}/invoice`)
      .set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(400);
  });
});
