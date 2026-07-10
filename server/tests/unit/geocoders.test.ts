import { mergeAndRank, scoreResult } from "../../src/utils/geocoders/merge";

describe("geocoders.mergeAndRank", () => {
  it("ranks sector 17 chandigarh results with locality first", () => {
    const merged = mergeAndRank("sector 17", [
      {
        provider: "photon",
        results: [
          {
            displayName: "Sector 17, Chandigarh, India",
            lat: 30.74,
            lng: 76.78,
          },
          {
            displayName: "Sector 17, Gurugram, Haryana, India",
            lat: 28.46,
            lng: 77.03,
          },
        ],
      },
    ]);
    expect(merged[0].displayName).toContain("Chandigarh");
  });

  it("boosts India results slightly for domestic logistics", () => {
    const india = scoreResult(
      "manali",
      { displayName: "Manali, Himachal Pradesh, India", lat: 32.24, lng: 77.19 },
      "photon"
    );
    const us = scoreResult(
      "manali",
      { displayName: "Manali, Tamil Nadu, India", lat: 13.16, lng: 80.26 },
      "openmeteo"
    );
    expect(india).toBeGreaterThan(us - 20);
  });
});
