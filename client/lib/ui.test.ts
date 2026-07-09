import { describe, expect, it } from "vitest";
import { STATUS_META, VEHICLE_META, currency } from "./ui";

describe("currency", () => {
  it("formats INR with rupee symbol", () => {
    expect(currency(500)).toBe("₹500");
    expect(currency(1234.7)).toBe("₹1,235");
  });
});

describe("STATUS_META", () => {
  it("covers every booking status", () => {
    const statuses = [
      "PENDING",
      "ACCEPTED",
      "ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ] as const;
    for (const s of statuses) {
      expect(STATUS_META[s].label).toBeTruthy();
      expect(STATUS_META[s].variant).toBeTruthy();
    }
  });
});

describe("VEHICLE_META", () => {
  it("has labels for all vehicle types", () => {
    expect(Object.keys(VEHICLE_META)).toHaveLength(6);
    for (const meta of Object.values(VEHICLE_META)) {
      expect(meta.label).toBeTruthy();
      expect(meta.icon).toBeTruthy();
    }
  });
});
