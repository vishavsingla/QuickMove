import { VehicleType } from "@prisma/client";
import { getCachedRates } from "../services/pricingRules";

export interface FareBreakdown {
  base: number;
  distanceCost: number;
  timeCost: number;
  surgeMultiplier: number;
  total: number;
}

/**
 * Simple surge: peak hours (8-11, 17-21) use vehicle peakSurge from pricing rules.
 */
export const currentSurge = (date = new Date(), vehicleType: VehicleType = "CAR"): number => {
  const h = date.getHours();
  const peak = (h >= 8 && h <= 11) || (h >= 17 && h <= 21);
  const rates = getCachedRates();
  const multiplier = rates[vehicleType]?.peakSurge ?? 1.25;
  return peak ? multiplier : 1;
};

export const estimateFare = (
  vehicleType: VehicleType,
  distanceKm: number,
  durationMin: number,
  surge = currentSurge(new Date(), vehicleType)
): FareBreakdown => {
  const rates = getCachedRates();
  const rate = rates[vehicleType] ?? rates.CAR;
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
