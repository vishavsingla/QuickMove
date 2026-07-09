import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt";

describe("jwt", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signAccessToken({ id: "u1", role: "USER" });
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe("u1");
    expect(decoded.role).toBe("USER");
  });

  it("preserves driverId in the payload", () => {
    const token = signAccessToken({ id: "u2", role: "DRIVER", driverId: "d1" });
    expect(verifyAccessToken(token).driverId).toBe("d1");
  });

  it("throws on a tampered token", () => {
    const token = signAccessToken({ id: "u3", role: "ADMIN" });
    expect(() => verifyAccessToken(token + "tampered")).toThrow();
  });
});
