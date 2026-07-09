import { VehicleType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface Rate {
  base: number;
  perKm: number;
  perMin: number;
  minFare: number;
  peakSurge: number;
}

export const DEFAULT_RATES: Record<VehicleType, Rate> = {
  BIKE: { base: 20, perKm: 7, perMin: 1, minFare: 30, peakSurge: 1.25 },
  CAR: { base: 40, perKm: 12, perMin: 1.5, minFare: 60, peakSurge: 1.25 },
  BIG_CAR: { base: 60, perKm: 16, perMin: 2, minFare: 90, peakSurge: 1.25 },
  TEMPO: { base: 90, perKm: 20, perMin: 2.5, minFare: 150, peakSurge: 1.25 },
  SMALL_TRUCK: { base: 120, perKm: 26, perMin: 3, minFare: 220, peakSurge: 1.25 },
  BIG_TRUCK: { base: 200, perKm: 38, perMin: 4, minFare: 400, peakSurge: 1.25 },
};

let cache: Record<VehicleType, Rate> | null = null;

export const loadPricingRules = async (): Promise<Record<VehicleType, Rate>> => {
  const rules = await prisma.pricingRule.findMany();
  if (rules.length === 0) {
    cache = { ...DEFAULT_RATES };
    return cache;
  }
  const map = { ...DEFAULT_RATES };
  for (const r of rules) {
    map[r.vehicleType] = {
      base: r.base,
      perKm: r.perKm,
      perMin: r.perMin,
      minFare: r.minFare,
      peakSurge: r.peakSurge,
    };
  }
  cache = map;
  return cache;
};

export const getCachedRates = (): Record<VehicleType, Rate> =>
  cache ?? DEFAULT_RATES;

export const invalidatePricingCache = () => {
  cache = null;
};

export const upsertPricingRule = async (
  vehicleType: VehicleType,
  data: Omit<Rate, "peakSurge"> & { peakSurge?: number }
) => {
  const rule = await prisma.pricingRule.upsert({
    where: { vehicleType },
    create: {
      vehicleType,
      base: data.base,
      perKm: data.perKm,
      perMin: data.perMin,
      minFare: data.minFare,
      peakSurge: data.peakSurge ?? 1.25,
    },
    update: {
      base: data.base,
      perKm: data.perKm,
      perMin: data.perMin,
      minFare: data.minFare,
      peakSurge: data.peakSurge ?? 1.25,
    },
  });
  await loadPricingRules();
  return rule;
};
