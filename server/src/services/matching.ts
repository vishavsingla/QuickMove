import { prisma } from "../lib/prisma";
import { haversineKm } from "../utils/geo";
import { emitToDriver } from "./realtime";
import { notify } from "./notifications";

const MATCH_RADIUS_KM = 50; // generous radius; drivers without a location still get offered

/**
 * Find approved, available drivers with a matching vehicle type near the pickup
 * point and offer them the job (DB notification + realtime "job:new").
 */
export const offerBookingToDrivers = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING") return [];

  const candidates = await prisma.driver.findMany({
    where: {
      isAvailable: true,
      status: "APPROVED",
      vehicleType: booking.vehicleType,
    },
  });

  const ranked = candidates
    .map((d) => {
      const distanceKm =
        d.currentLat != null && d.currentLng != null
          ? haversineKm(d.currentLat, d.currentLng, booking.pickupLat, booking.pickupLng)
          : Number.POSITIVE_INFINITY;
      return { driver: d, distanceKm };
    })
    .filter((r) => r.distanceKm <= MATCH_RADIUS_KM || r.distanceKm === Infinity)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (const { driver, distanceKm } of ranked) {
    await notify({
      type: "JOB_OFFER",
      message: `New ${booking.vehicleType} job: ${booking.pickupLocation} -> ${booking.dropoffLocation}. Fare ~₹${booking.estimatedCost}.`,
      driverId: driver.id,
      bookingId: booking.id,
    });
    emitToDriver(driver.id, "job:new", {
      bookingId: booking.id,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      estimatedCost: booking.estimatedCost,
      estimatedDistance: booking.estimatedDistance,
      vehicleType: booking.vehicleType,
      distanceToPickupKm: Number.isFinite(distanceKm)
        ? Number(distanceKm.toFixed(1))
        : null,
    });
  }

  return ranked.map((r) => r.driver.id);
};
