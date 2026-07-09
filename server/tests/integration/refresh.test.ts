import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

beforeEach(resetDb);
afterAll(disconnect);

describe("refresh tokens", () => {
  const user = {
    name: "Alice",
    email: "alice@test.dev",
    phoneNumber: "+910000000001",
    password: "secret123",
  };

  it("issues refresh token on login and rotates on refresh", async () => {
    await request(app).post("/api/auth/register/user").send(user);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });
    expect(login.body.refreshToken).toBeTruthy();

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.token).toBeTruthy();
    expect(refreshed.body.refreshToken).toBeTruthy();
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refreshed.body.token}`);
    expect(me.status).toBe(200);

    // Old refresh token is invalidated after rotation.
    const stale = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    expect(stale.status).toBe(401);
  });

  it("revokes session on logout", async () => {
    const reg = await request(app).post("/api/auth/register/user").send(user);
    const logout = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: reg.body.refreshToken });
    expect(logout.status).toBe(200);

    const refresh = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: reg.body.refreshToken });
    expect(refresh.status).toBe(401);
  });
});
