import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

beforeEach(resetDb);
afterAll(disconnect);

describe("security", () => {
  it("handles CORS preflight for allowed origin", async () => {
    const res = await request(app)
      .options("/api/auth/register/user")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("sets helmet security headers on API responses", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeTruthy();
  });

  it("returns 401 for protected routes without a token", async () => {
    const res = await request(app).get("/api/bookings");
    expect(res.status).toBe(401);
  });

  it("returns 403 when a user hits admin routes", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Regular",
      email: `sec-${Date.now()}@test.dev`,
      phoneNumber: `+91${Date.now()}`,
      password: "secret123",
    });
    const res = await request(app)
      .get("/api/admin/drivers")
      .set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });

  it("does not expose password hashes in auth responses", async () => {
    const reg = await request(app).post("/api/auth/register/user").send({
      name: "Safe",
      email: `hash-${Date.now()}@test.dev`,
      phoneNumber: `+92${Date.now()}`,
      password: "secret123",
    });
    expect(reg.body.user?.hashedPassword).toBeUndefined();
  });
});
