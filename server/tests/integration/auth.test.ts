import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

beforeEach(resetDb);
afterAll(disconnect);

describe("auth", () => {
  const user = {
    name: "Alice",
    email: "alice@test.dev",
    phoneNumber: "+910000000001",
    password: "secret123",
  };

  it("registers a user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register/user").send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe("USER");
    expect(res.body.user.hashedPassword).toBeUndefined();
  });

  it("rejects duplicate email/phone", async () => {
    await request(app).post("/api/auth/register/user").send(user);
    const res = await request(app).post("/api/auth/register/user").send(user);
    expect(res.status).toBe(409);
  });

  it("validates required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register/user")
      .send({ email: "x@test.dev" });
    expect(res.status).toBe(400);
  });

  it("logs in with valid credentials and rejects bad ones", async () => {
    await request(app).post("/api/auth/register/user").send(user);

    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.refreshToken).toBeTruthy();

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong" });
    expect(bad.status).toBe(401);
  });

  it("returns the current user for /me and 401 without a token", async () => {
    const reg = await request(app).post("/api/auth/register/user").send(user);
    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(user.email);

    const noauth = await request(app).get("/api/auth/me");
    expect(noauth.status).toBe(401);
  });

  it("registers a driver in PENDING state with a vehicle", async () => {
    const res = await request(app).post("/api/auth/register/driver").send({
      name: "Bob Driver",
      email: "bob@test.dev",
      phoneNumber: "+910000000002",
      password: "secret123",
      licenseNumber: "DL-1",
      vehicleType: "CAR",
      licensePlate: "KA01XX0001",
      city: "Bangalore",
      area: "Indiranagar",
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("DRIVER");
    expect(res.body.driver.status).toBe("PENDING");
  });

  it("guards admin registration behind the admin secret", async () => {
    const bad = await request(app).post("/api/auth/register/admin").send({
      name: "Admin",
      email: "admin@test.dev",
      phoneNumber: "+910000000003",
      password: "secret123",
      adminSecret: "wrong",
    });
    expect(bad.status).toBe(403);
  });
});
