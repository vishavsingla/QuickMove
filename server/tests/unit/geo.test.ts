import axios from "axios";
import { haversineKm, routeBetween, geocode, reverseGeocode } from "../../src/utils/geo";
import { searchLocalCities } from "../../src/utils/cityFallback";
import { mergeAndRank, scoreResult } from "../../src/utils/geocoders/merge";

jest.mock("../../src/utils/geocoders/http", () => ({
  geoHttp: {
    get: jest.fn(),
  },
}));

import { geoHttp } from "../../src/utils/geocoders/http";
const mockedGeoHttp = geoHttp as jest.Mocked<typeof geoHttp>;

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("geo.haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(12.97, 77.59, 12.97, 77.59)).toBeCloseTo(0, 5);
  });

  it("computes a sensible distance between two known points", () => {
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

describe("geocoders.mergeAndRank", () => {
  it("dedupes near-identical results and prefers prefix matches", () => {
    const merged = mergeAndRank("man", [
      {
        provider: "photon",
        results: [
          { displayName: "Manali, Himachal Pradesh, India", lat: 32.24, lng: 77.19 },
          { displayName: "Manchester, England, United Kingdom", lat: 53.48, lng: -2.24 },
        ],
      },
      {
        provider: "nominatim",
        results: [
          { displayName: "Manali, Himachal Pradesh, India", lat: 32.243, lng: 77.189 },
        ],
      },
    ]);
    expect(merged.length).toBe(2);
    expect(merged[0].displayName.toLowerCase()).toContain("manali");
  });

  it("scores prefix matches higher than loose contains", () => {
    const manali = scoreResult(
      "man",
      { displayName: "Manali, Himachal Pradesh, India", lat: 32.24, lng: 77.19 },
      "photon"
    );
    const manhattan = scoreResult(
      "man",
      { displayName: "Manhattan, New York, United States", lat: 40.78, lng: -73.97 },
      "photon"
    );
    expect(manali).toBeGreaterThan(manhattan);
  });
});

describe("geo.geocode", () => {
  beforeEach(() => {
    mockedGeoHttp.get.mockReset();
  });

  it("falls back to local cities when all providers fail", async () => {
    mockedGeoHttp.get.mockRejectedValue(new Error("SSL error"));
    const results = await geocode("chandigarh");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].displayName.toLowerCase()).toContain("chandigarh");
  });

  it("merges photon and nominatim results", async () => {
    mockedGeoHttp.get.mockImplementation(async (url: string) => {
      if (url.includes("photon")) {
        return {
          data: {
            features: [
              {
                properties: { name: "Manali", state: "Himachal Pradesh", country: "India" },
                geometry: { coordinates: [77.1892, 32.2432] },
              },
            ],
          },
        } as any;
      }
      if (url.includes("nominatim")) {
        return {
          data: [
            {
              display_name: "Chandigarh, India",
              lat: "30.7334",
              lon: "76.7797",
            },
          ],
        } as any;
      }
      return { data: { results: [] } } as any;
    });

    const results = await geocode("test");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.displayName.includes("Manali"))).toBe(true);
  });

  it("accepts 2-character queries", async () => {
    mockedGeoHttp.get.mockRejectedValue(new Error("offline"));
    const results = await geocode("ma");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("geo.reverseGeocode", () => {
  beforeEach(() => {
    mockedGeoHttp.get.mockReset();
  });

  it("returns coordinates label when reverse fails", async () => {
    mockedGeoHttp.get.mockRejectedValue(new Error("SSL error"));
    const place = await reverseGeocode(30.73, 76.78);
    expect(place.lat).toBe(30.73);
    expect(place.displayName).toBeTruthy();
  });

  it("uses nominatim reverse when available", async () => {
    mockedGeoHttp.get.mockResolvedValueOnce({
      data: { display_name: "Chandigarh, India" },
    } as any);
    const place = await reverseGeocode(30.73, 76.78);
    expect(place.displayName).toBe("Chandigarh, India");
  });
});

describe("cityFallback.searchLocalCities", () => {
  it("finds chandigarh and manali from 2 chars", () => {
    expect(searchLocalCities("chandigarh")[0].displayName).toContain("Chandigarh");
    expect(searchLocalCities("ma")[0].displayName).toContain("Manali");
    expect(searchLocalCities("manali")[0].displayName).toContain("Manali");
  });
});
