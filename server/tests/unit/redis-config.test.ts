import { env } from "../../src/config/env";
import {
  buildRedisClientOptions,
  normalizeRedisUrl,
  redactRedisUrl,
} from "../../src/lib/redis";

describe("redis socket config", () => {
  it("redisUrl defaults to empty for single-node mode", () => {
    expect(env.redisUrl).toBe("");
  });

  it("upgrades redis:// to rediss:// for Upstash hosts", () => {
    const url =
      "redis://default:secret@magical-mosquito-162958.upstash.io:6379";
    expect(normalizeRedisUrl(url)).toBe(
      "rediss://default:secret@magical-mosquito-162958.upstash.io:6379"
    );
  });

  it("leaves rediss:// Upstash URLs unchanged", () => {
    const url =
      "rediss://default:secret@magical-mosquito-162958.upstash.io:6379";
    expect(normalizeRedisUrl(url)).toBe(url);
  });

  it("leaves local redis:// URLs unchanged", () => {
    const url = "redis://localhost:6379";
    expect(normalizeRedisUrl(url)).toBe(url);
  });

  it("enables TLS socket options for rediss:// URLs", () => {
    const options = buildRedisClientOptions(
      "rediss://default:secret@example.upstash.io:6379"
    );
    expect(options.url).toContain("rediss://");
    expect(options.socket).toMatchObject({
      tls: true,
      rejectUnauthorized: false,
      family: 4,
      connectTimeout: 10_000,
    });
  });

  it("does not enable TLS for local redis:// URLs", () => {
    const options = buildRedisClientOptions("redis://localhost:6379");
    expect(options.socket?.tls).toBeUndefined();
    expect("family" in (options.socket ?? {})).toBe(false);
  });

  it("redacts passwords in Redis URLs for logging", () => {
    expect(
      redactRedisUrl(
        "rediss://default:my-secret-token@host.upstash.io:6379"
      )
    ).toBe("rediss://default:****@host.upstash.io:6379");
  });
});
