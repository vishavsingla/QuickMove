import {
  createCorsOriginCallback,
  isOriginAllowed,
  parseCorsOrigins,
} from "../../src/config/cors";

describe("cors config", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.CORS_ORIGINS;
    delete process.env.CLIENT_ORIGIN;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it("parses comma-separated CORS_ORIGINS", () => {
    process.env.CORS_ORIGINS =
      "http://localhost:3000,https://quickmove.vercel.app";
    expect(parseCorsOrigins()).toEqual([
      "http://localhost:3000",
      "https://quickmove.vercel.app",
    ]);
  });

  it("falls back to CLIENT_ORIGIN", () => {
    process.env.CLIENT_ORIGIN = "https://quickmove.vercel.app";
    expect(parseCorsOrigins()).toEqual(["https://quickmove.vercel.app"]);
  });

  it("strips trailing slashes from origins", () => {
    process.env.CORS_ORIGINS = "https://quickmove.vercel.app/";
    expect(parseCorsOrigins()).toEqual(["https://quickmove.vercel.app"]);
  });

  it("matches exact origins", () => {
    const allowed = ["http://localhost:3000", "https://quickmove.vercel.app"];
    expect(isOriginAllowed("https://quickmove.vercel.app", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
  });

  it("matches wildcard vercel preview origins", () => {
    const allowed = ["https://*.vercel.app"];
    expect(
      isOriginAllowed("https://quickmove-git-main-user.vercel.app", allowed)
    ).toBe(true);
    expect(isOriginAllowed("https://quickmove.vercel.app", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.vercel.app.evil.com", allowed)).toBe(
      false
    );
  });

  it("allows requests with no Origin header", () => {
    expect(isOriginAllowed(undefined, ["https://quickmove.vercel.app"])).toBe(
      true
    );
  });

  it("origin callback permits allowed origins", (done) => {
    const cb = createCorsOriginCallback(["https://quickmove.vercel.app"]);
    cb("https://quickmove.vercel.app", (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it("origin callback rejects disallowed origins", (done) => {
    const cb = createCorsOriginCallback(["https://quickmove.vercel.app"]);
    cb("https://evil.example", (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(false);
      done();
    });
  });
});
