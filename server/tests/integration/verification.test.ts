import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

beforeEach(resetDb);
afterAll(disconnect);

describe("verification & oauth", () => {
  const user = {
    name: "Alice",
    email: "alice@test.dev",
    phoneNumber: "+910000000001",
    password: "secret123",
  };

  const authHeader = async () => {
    const reg = await request(app).post("/api/auth/register/user").send(user);
    return `Bearer ${reg.body.token}`;
  };

  it("returns auth config with oauth stub when keys missing", async () => {
    const res = await request(app).get("/api/auth/config");
    expect(res.status).toBe(200);
    expect(res.body.googleOAuth.enabled).toBe(true);
    expect(res.body.googleOAuth.mode).toBe("mock");
    expect(res.body.otp.debug).toBe(true);
  });

  it("sends and verifies phone OTP (debug mode returns code)", async () => {
    const token = await authHeader();
    const send = await request(app)
      .post("/api/auth/otp/send")
      .set("Authorization", token)
      .send({ channel: "phone", target: user.phoneNumber });
    expect(send.status).toBe(200);
    expect(send.body.debugOtp).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post("/api/auth/otp/verify")
      .set("Authorization", token)
      .send({
        channel: "phone",
        target: user.phoneNumber,
        code: send.body.debugOtp,
      });
    expect(verify.status).toBe(200);
    expect(verify.body.user.phoneVerified).toBe(true);

    const notifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", token);
    expect(notifications.body.notifications[0].type).toBe("VERIFICATION_SUCCESS");
  });

  it("sends and verifies email OTP", async () => {
    const token = await authHeader();
    const send = await request(app)
      .post("/api/auth/otp/send")
      .set("Authorization", token)
      .send({ channel: "email", target: user.email });
    expect(send.status).toBe(200);
    expect(send.body.debugOtp).toBeTruthy();

    const verify = await request(app)
      .post("/api/auth/otp/verify")
      .set("Authorization", token)
      .send({ channel: "email", target: user.email, code: send.body.debugOtp });
    expect(verify.status).toBe(200);
    expect(verify.body.user.emailVerified).toBe(true);
  });

  it("rejects invalid OTP", async () => {
    const token = await authHeader();
    await request(app)
      .post("/api/auth/otp/send")
      .set("Authorization", token)
      .send({ channel: "phone", target: user.phoneNumber });

    const verify = await request(app)
      .post("/api/auth/otp/verify")
      .set("Authorization", token)
      .send({ channel: "phone", target: user.phoneNumber, code: "000000" });
    expect(verify.status).toBe(400);
  });

  it("rate limits OTP sends per target (3 per 15min)", async () => {
    const token = await authHeader();
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/auth/otp/send")
        .set("Authorization", token)
        .send({ channel: "phone", target: user.phoneNumber });
      expect(res.status).toBe(200);
    }
    const blocked = await request(app)
      .post("/api/auth/otp/send")
      .set("Authorization", token)
      .send({ channel: "phone", target: user.phoneNumber });
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses oauth stub redirect when Google keys are not set", async () => {
    const res = await request(app).get("/api/auth/oauth/google");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/mock=1/);
  });

  it("does not block guest booking without verification", async () => {
    const res = await request(app).post("/api/bookings/guest").send({
      name: "Guest",
      phoneNumber: "+919999999999",
      pickupLocation: "A",
      pickupLat: 12.97,
      pickupLng: 77.59,
      dropoffLocation: "B",
      dropoffLat: 12.98,
      dropoffLng: 77.6,
      vehicleType: "CAR",
    });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeTruthy();
  });

  it("verifies email via token", async () => {
    const { createEmailVerificationToken } = await import("../../src/services/otp");
    const { prisma } = await import("../../src/lib/prisma");
    await request(app).post("/api/auth/register/user").send({
      ...user,
      email: "verify@test.dev",
      phoneNumber: "+910000000098",
    });
    const dbUser = await prisma.user.findUnique({ where: { email: "verify@test.dev" } });
    const token = await createEmailVerificationToken(dbUser!.id, "verify@test.dev");
    const res = await request(app).get(`/api/auth/verify-email?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
  });

  it("phone OTP login creates user and returns tokens", async () => {
    const send = await request(app)
      .post("/api/auth/otp/send")
      .send({ phoneNumber: "+919988776655" });
    expect(send.status).toBe(200);
    expect(send.body.debugOtp).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phoneNumber: "+919988776655", code: send.body.debugOtp });
    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTruthy();
    expect(verify.body.user.phoneVerified).toBe(true);
  });

  it("sends public phone OTP for guest flow", async () => {
    const send = await request(app)
      .post("/api/auth/otp/send")
      .send({ phoneNumber: "+919876543210", purpose: "guest" });
    expect(send.status).toBe(200);
    expect(send.body.debugOtp).toBeTruthy();
  });

  it("links google profile to new user (mock)", async () => {
    const { findOrLinkGoogleUser } = await import("../../src/services/oauth");
    const linked = await findOrLinkGoogleUser({
      id: "google-mock-123",
      email: "oauth@test.dev",
      name: "OAuth User",
      verified_email: true,
    });
    expect(linked.email).toBe("oauth@test.dev");
    expect(linked.googleId).toBe("google-mock-123");
  });
});
