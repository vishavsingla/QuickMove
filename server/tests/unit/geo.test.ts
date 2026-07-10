import axios from "axios";
import { haversineKm, routeBetween, geocode, reverseGeocode } from "../../src/utils/geo";
import { searchLocalCities } from "../../src/utils/cityFallback";

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

describe("geo.geocode", () => {
  it("falls back to local cities when Nominatim fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("SSL error"));
    const results = await geocode("chandigarh");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].displayName.toLowerCase()).toContain("chandigarh");
  });

  it("uses Nominatim when available", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          display_name: "Test City, India",
          lat: "12.9",
          lon: "77.5",
        },
      ],
    } as any);
    const results = await geocode("test city");
    expect(results[0].displayName).toBe("Test City, India");
  });
});

describe("geo.reverseGeocode", () => {
  it("returns coordinates label when reverse fails", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("SSL error"));
    const place = await reverseGeocode(30.73, 76.78);
    expect(place.lat).toBe(30.73);
    expect(place.displayName).toBeTruthy();
  });
});

describe("cityFallback.searchLocalCities", () => {
  it("finds chandigarh and manali", () => {
    expect(searchLocalCities("chandigarh")[0].displayName).toContain("Chandigarh");
    expect(searchLocalCities("manali")[0].displayName).toContain("Manali");
  });
});
