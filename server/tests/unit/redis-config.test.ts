import { env } from "../../src/config/env";

describe("redis socket config", () => {
  it("redisUrl defaults to empty for single-node mode", () => {
    expect(env.redisUrl).toBe("");
  });
});
