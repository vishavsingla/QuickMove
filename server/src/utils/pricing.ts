import { VehicleType } from "@prisma/client";

interface Rate {
  base: number; // flat fare
  perKm: number;
  perMin: number;
  minFare: number;
}

// Rates in INR. Tuned so larger vehicles cost more.
const RATES: Record<VehicleType, Rate> = {
  BIKE: { base: 20, perKm: 7, perMin: 1, minFare: 30 },
  CAR: { base: 40, perKm: 12, perMin: 1.5, minFare: 60 },
  BIG_CAR: { base: 60, perKm: 16, perMin: 2, minFare: 90 },
  TEMPO: { base: 90, perKm: 20, perMin: 2.5, minFare: 150 },
  SMALL_TRUCK: { base: 120, perKm: 26, perMin: 3, minFare: 220 },
  BIG_TRUCK: { base: 200, perKm: 38, perMin: 4, minFare: 400 },
};

export interface FareBreakdown {
  base: number;
  distanceCost: number;
  timeCost: number;
  surgeMultiplier: number;
  total: number;
}

/**
 * Simple surge: peak hours (8-11, 17-21) add 25%.
 */
export const currentSurge = (date = new Date()): number => {
  const h = date.getHours();
  const peak = (h >= 8 && h <= 11) || (h >= 17 && h <= 21);
  return peak ? 1.25 : 1;
};

export const estimateFare = (
  vehicleType: VehicleType,
  distanceKm: number,
  durationMin: number,
  surge = currentSurge()
): FareBreakdown => {
  const rate = RATES[vehicleType] ?? RATES.CAR;
  const distanceCost = distanceKm * rate.perKm;
  const timeCost = durationMin * rate.perMin;
  const subtotal = rate.base + distanceCost + timeCost;
  const total = Math.max(rate.minFare, Math.round(subtotal * surge));
  return {
    base: rate.base,
    distanceCost: Math.round(distanceCost),
    timeCost: Math.round(timeCost),
    surgeMultiplier: surge,
    total,
  };
};
