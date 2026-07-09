import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerAdmin = async () => {
  const res = await request(app).post("/api/auth/register/admin").send({
    name: "Root",
    email: "root@test.dev",
    phoneNumber: "+914444444444",
    password: "secret123",
    adminSecret: "quickmove-admin",
  });
  return res.body.token as string;
};

const registerUser = async () => {
  const res = await request(app).post("/api/auth/register/user").send({
    name: "U",
    email: "u@test.dev",
    phoneNumber: "+915555555555",
    password: "secret123",
  });
  return res.body.token as string;
};

const registerDriver = async () => {
  const res = await request(app).post("/api/auth/register/driver").send({
    name: "D",
    email: "d@test.dev",
    phoneNumber: "+916666666666",
    password: "secret123",
    licenseNumber: "DL-5",
    vehicleType: "TEMPO",
    licensePlate: "KA05TT0005",
    city: "Bangalore",
    area: "HSR",
  });
  return res.body.driver.id as string;
};

beforeEach(resetDb);
afterAll(disconnect);

describe("admin", () => {
  it("forbids non-admins from admin routes", async () => {
    const userToken = await registerUser();
    const res = await request(app)
      .get("/api/admin/drivers")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("approves a pending driver", async () => {
    const adminToken = await registerAdmin();
    const driverId = await registerDriver();

    const list = await request(app)
      .get("/api/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.body.drivers.length).toBe(1);

    const approve = await request(app)
      .post(`/api/admin/drivers/${driverId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });
    expect(approve.status).toBe(200);
    expect(approve.body.driver.status).toBe("APPROVED");
  });

  it("rejects an invalid driver status", async () => {
    const adminToken = await registerAdmin();
    const driverId = await registerDriver();
    const res = await request(app)
      .post(`/api/admin/drivers/${driverId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "BANANA" });
    expect(res.status).toBe(400);
  });

  it("returns platform stats", async () => {
    const adminToken = await registerAdmin();
    await registerUser();
    await registerDriver();
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totals.users).toBeGreaterThanOrEqual(1);
    expect(res.body.totals.drivers).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.bookingsByStatus)).toBe(true);
  });
});
