import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { resetDb, disconnect } from "../helpers";

const app = createApp();

const registerDriver = async () => {
  const res = await request(app).post("/api/auth/register/driver").send({
    name: "KYC Driver",
    email: `kyc-${Date.now()}@test.dev`,
    phoneNumber: `+91${Date.now()}`,
    password: "secret123",
    licenseNumber: "DL-KYC",
    vehicleType: "CAR",
    licensePlate: "KA99KYC9999",
    city: "Bangalore",
    area: "MG Road",
  });
  return {
    token: res.body.token as string,
    driverId: res.body.driver.id as string,
  };
};

const registerAdmin = async () => {
  const res = await request(app).post("/api/auth/register/admin").send({
    name: "Admin",
    email: `admin-kyc-${Date.now()}@test.dev`,
    phoneNumber: `+92${Date.now()}`,
    password: "secret123",
    adminSecret: "quickmove-admin",
  });
  return res.body.token as string;
};

beforeEach(resetDb);
afterAll(disconnect);

describe("driver KYC", () => {
  it("lets a driver submit KYC document stubs", async () => {
    const { token } = await registerDriver();
    const submit = await request(app)
      .post("/api/driver/kyc/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({ licenseFileName: "license.pdf", idFileName: "aadhaar.pdf" });
    expect(submit.status).toBe(200);
    expect(submit.body.kyc.kycStatus).toBe("SUBMITTED");
    expect(submit.body.kyc.licenseDocUrl).toContain("stub://kyc/");

    const kyc = await request(app)
      .get("/api/driver/kyc")
      .set("Authorization", `Bearer ${token}`);
    expect(kyc.body.kyc.kycStatus).toBe("SUBMITTED");
  });

  it("lets admin verify submitted KYC", async () => {
    const { token: driverToken, driverId } = await registerDriver();
    const adminToken = await registerAdmin();

    await request(app)
      .post("/api/driver/kyc/submit")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ licenseFileName: "license.pdf", idFileName: "id.pdf" });

    const verify = await request(app)
      .post(`/api/admin/drivers/${driverId}/kyc`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "VERIFIED" });
    expect(verify.status).toBe(200);
    expect(verify.body.driver.kycStatus).toBe("VERIFIED");

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    expect(driver?.kycStatus).toBe("VERIFIED");
  });

  it("rejects KYC review when nothing submitted", async () => {
    const { driverId } = await registerDriver();
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post(`/api/admin/drivers/${driverId}/kyc`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "VERIFIED" });
    expect(res.status).toBe(400);
  });
});
