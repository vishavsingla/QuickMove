import { estimateFare, currentSurge } from "../../src/utils/pricing";

describe("pricing.estimateFare", () => {
  it("charges more for larger vehicles over the same route", () => {
    const bike = estimateFare("BIKE", 10, 20, 1);
    const truck = estimateFare("BIG_TRUCK", 10, 20, 1);
    expect(truck.total).toBeGreaterThan(bike.total);
  });

  it("applies the surge multiplier", () => {
    const normal = estimateFare("CAR", 10, 20, 1);
    const surged = estimateFare("CAR", 10, 20, 1.5);
    expect(surged.total).toBeGreaterThan(normal.total);
  });

  it("never charges below the minimum fare", () => {
    const tiny = estimateFare("BIKE", 0.1, 1, 1);
    expect(tiny.total).toBeGreaterThanOrEqual(30);
  });

  it("breaks fare into base, distance and time components", () => {
    const fare = estimateFare("CAR", 10, 20, 1);
    expect(fare.base).toBeGreaterThan(0);
    expect(fare.distanceCost).toBeGreaterThan(0);
    expect(fare.timeCost).toBeGreaterThan(0);
  });
});

describe("pricing.currentSurge", () => {
  it("returns 1.25 during peak evening hours", () => {
    expect(currentSurge(new Date("2026-01-01T18:00:00"))).toBe(1.25);
  });

  it("returns 1 during off-peak hours", () => {
    expect(currentSurge(new Date("2026-01-01T14:00:00"))).toBe(1);
  });
});
