import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnect } from "../helpers";
import { getCachedRates } from "../../src/services/pricingRules";

const app = createApp();

const adminToken = async () => {
  const res = await request(app).post("/api/auth/register/admin").send({
    name: "Admin",
    email: `adm-pr-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
    adminSecret: "quickmove-admin",
  });
  return res.body.token as string;
};

beforeEach(resetDb);
afterAll(disconnect);

describe("admin pricing rules", () => {
  it("lists default pricing rules", async () => {
    const token = await adminToken();
    const res = await request(app)
      .get("/api/admin/pricing-rules")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rules.length).toBeGreaterThanOrEqual(6);
  });

  it("updates a vehicle rate and reflects in cache", async () => {
    const token = await adminToken();
    const res = await request(app)
      .put("/api/admin/pricing-rules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleType: "CAR",
        base: 50,
        perKm: 15,
        perMin: 2,
        minFare: 70,
        peakSurge: 1.3,
      });
    expect(res.status).toBe(200);
    expect(getCachedRates().CAR.base).toBe(50);
  });
});
