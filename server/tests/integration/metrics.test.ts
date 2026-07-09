import request from "supertest";
import { createApp } from "../../src/app";
import { disconnect } from "../helpers";

const app = createApp();

afterAll(disconnect);

describe("metrics", () => {
  it("exposes Prometheus metrics at /metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("quickmove_http_requests_total");
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
  });
});
