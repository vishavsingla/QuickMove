import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapAuth,
  refreshAccessToken,
  tokenStore,
} from "./api";

const API = "http://localhost:5001";

describe("tokenStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("tracks access and refresh tokens", () => {
    tokenStore.set("access-1");
    tokenStore.setRefresh("refresh-1");
    expect(tokenStore.get()).toBe("access-1");
    expect(tokenStore.getRefresh()).toBe("refresh-1");
    expect(tokenStore.hasSession()).toBe(true);
  });

  it("hasSession is true when only refresh token exists", () => {
    tokenStore.setRefresh("refresh-only");
    expect(tokenStore.hasSession()).toBe(true);
    expect(tokenStore.get()).toBeNull();
  });

  it("clearAll removes both tokens", () => {
    tokenStore.set("a");
    tokenStore.setRefresh("r");
    tokenStore.clearAll();
    expect(tokenStore.hasSession()).toBe(false);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores rotated tokens on success", async () => {
    tokenStore.set("stale");
    tokenStore.setRefresh("old-refresh");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "new-access",
          refreshToken: "new-refresh",
        }),
      })
    );

    const ok = await refreshAccessToken();
    expect(ok).toBe(true);
    expect(tokenStore.get()).toBe("new-access");
    expect(tokenStore.getRefresh()).toBe("new-refresh");
    expect(fetch).toHaveBeenCalledWith(
      `${API}/api/auth/refresh`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("dedupes concurrent refresh calls", async () => {
    tokenStore.setRefresh("r1");
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          json: async () => ({ token: "t2", refreshToken: "r2" }),
        };
      })
    );

    const [a, b] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(calls).toBe(1);
  });

  it("clears session when refresh is rejected", async () => {
    tokenStore.set("stale");
    tokenStore.setRefresh("bad");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    const ok = await refreshAccessToken();
    expect(ok).toBe(false);
    expect(tokenStore.hasSession()).toBe(false);
  });
});

describe("bootstrapAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no persisted session", async () => {
    expect(await bootstrapAuth()).toBeNull();
  });

  it("calls /me when access token is present", async () => {
    tokenStore.set("valid");
    const mePayload = { user: { id: "u1", name: "Alice" }, role: "USER" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mePayload),
      })
    );

    const res = await bootstrapAuth();
    expect(res).toEqual(mePayload);
    expect(fetch).toHaveBeenCalledWith(
      `${API}/api/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer valid",
        }),
      })
    );
  });

  it("refreshes first when only refresh token is stored", async () => {
    tokenStore.setRefresh("refresh-only");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "fresh", refreshToken: "rotated" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ user: { id: "u2" }, role: "DRIVER" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await bootstrapAuth();
    expect(res?.role).toBe("DRIVER");
    expect(tokenStore.get()).toBe("fresh");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
