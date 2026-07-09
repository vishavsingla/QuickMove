import axios from "axios";
import { haversineKm, routeBetween } from "../../src/utils/geo";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("geo.haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(12.97, 77.59, 12.97, 77.59)).toBeCloseTo(0, 5);
  });

  it("computes a sensible distance between two known points", () => {
    // Bangalore MG Road -> Koramangala is roughly 4-6 km straight line
    const d = haversineKm(12.9716, 77.5946, 12.9352, 77.6245);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(8);
  });
});

describe("geo.routeBetween", () => {
  it("uses OSRM when available", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { routes: [{ distance: 5000, duration: 600 }] },
    } as any);
    const r = await routeBetween({ lat: 12.9, lng: 77.5 }, { lat: 13.0, lng: 77.6 });
    expect(r.source).toBe("osrm");
    expect(r.distanceKm).toBeCloseTo(5, 3);
    expect(r.durationMin).toBeCloseTo(10, 3);
  });

  it("falls back to haversine when OSRM fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("network down"));
    const r = await routeBetween({ lat: 12.9, lng: 77.5 }, { lat: 13.0, lng: 77.6 });
    expect(r.source).toBe("haversine");
    expect(r.distanceKm).toBeGreaterThan(0);
    expect(r.durationMin).toBeGreaterThan(0);
  });
});
