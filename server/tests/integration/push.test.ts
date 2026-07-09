import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerUser = async () => {
  const res = await request(app).post("/api/auth/register/user").send({
    name: "Push User",
    email: `push-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
  });
  return {
    token: res.body.token as string,
    userId: res.body.user.id as string,
  };
};

beforeEach(resetDb);
afterAll(disconnect);

describe("web push stubs", () => {
  it("saves a push subscription stub", async () => {
    const { token, userId } = await registerUser();
    const endpoint = `stub://push/${userId}/device-1`;

    const sub = await request(app)
      .post("/api/notifications/push/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint, keys: { p256dh: "key", auth: "auth" } });
    expect(sub.status).toBe(200);

    const status = await request(app)
      .get("/api/notifications/push/status")
      .set("Authorization", `Bearer ${token}`);
    expect(status.body.enabled).toBe(true);
    expect(status.body.subscriptions).toBe(1);
  });

  it("unsubscribes from push", async () => {
    const { token, userId } = await registerUser();
    const endpoint = `stub://push/${userId}/device-2`;

    await request(app)
      .post("/api/notifications/push/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint });

    const off = await request(app)
      .post("/api/notifications/push/unsubscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint });
    expect(off.status).toBe(200);

    const status = await request(app)
      .get("/api/notifications/push/status")
      .set("Authorization", `Bearer ${token}`);
    expect(status.body.enabled).toBe(false);
  });

  it("requires auth for push subscribe", async () => {
    const res = await request(app)
      .post("/api/notifications/push/subscribe")
      .send({ endpoint: "stub://push/x" });
    expect(res.status).toBe(401);
  });
});
