import { VehicleType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { routeBetween, routeThrough, GeoPoint } from "../utils/geo";
import { estimateFare, currentSurge } from "../utils/pricing";
import { offerBookingToDrivers } from "./matching";
import { applyCouponToBooking } from "./coupons";
import { bookingsCreatedTotal } from "../observability/metrics";

export const bookingInclude: Prisma.BookingInclude = {
  driver: {
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      vehicleType: true,
      licensePlate: true,
      rating: true,
      currentLat: true,
      currentLng: true,
    },
  },
  user: { select: { id: true, name: true, phoneNumber: true } },
  stops: { orderBy: { orderIndex: "asc" } },
};

export interface CreateBookingInput {
  userId: string;
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLocation: string;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: VehicleType;
  scheduledTime?: string | null;
  stops?: Array<{ location: string; lat: number; lng: number }>;
  couponCode?: string;
}

export const createBookingRecord = async (input: CreateBookingInput) => {
  const {
    userId,
    pickupLocation,
    pickupLat,
    pickupLng,
    dropoffLocation,
    dropoffLat,
    dropoffLng,
    vehicleType,
    scheduledTime,
    stops,
    couponCode,
  } = input;

  const points: GeoPoint[] = [
    { lat: pickupLat, lng: pickupLng },
    ...(Array.isArray(stops)
      ? stops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
      : []),
    { lat: dropoffLat, lng: dropoffLng },
  ];

  const route =
    points.length > 2
      ? await routeThrough(points)
      : await routeBetween(points[0], points[points.length - 1]);
  const distanceKm = Number(route.distanceKm.toFixed(2));
  const durationMin = Number(route.durationMin.toFixed(1));
  const fare = estimateFare(vehicleType, distanceKm, durationMin, currentSurge());

  const booking = await prisma.booking.create({
    data: {
      userId,
      pickupLocation,
      pickupLat,
      pickupLng,
      dropoffLocation,
      dropoffLat,
      dropoffLng,
      vehicleType,
      estimatedDistance: distanceKm,
      estimatedDuration: durationMin,
      estimatedCost: fare.total,
      status: "PENDING",
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      stops: Array.isArray(stops) && stops.length
        ? {
            create: [
              {
                orderIndex: 0,
                location: pickupLocation,
                lat: pickupLat,
                lng: pickupLng,
                stopType: "PICKUP",
              },
              ...stops.map((s, i) => ({
                orderIndex: i + 1,
                location: s.location,
                lat: Number(s.lat),
                lng: Number(s.lng),
                stopType: "WAYPOINT" as const,
              })),
              {
                orderIndex: stops.length + 1,
                location: dropoffLocation,
                lat: dropoffLat,
                lng: dropoffLng,
                stopType: "DROP",
              },
            ],
          }
        : undefined,
    },
    include: bookingInclude,
  });

  let finalBooking = booking;
  if (couponCode) {
    try {
      await applyCouponToBooking(booking.id, couponCode, userId);
      finalBooking = await prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    } catch (err) {
      await prisma.booking.delete({ where: { id: booking.id } });
      throw err;
    }
  }

  offerBookingToDrivers(finalBooking.id).catch(() => undefined);
  bookingsCreatedTotal.inc();

  return finalBooking;
};
