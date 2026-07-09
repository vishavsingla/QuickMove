import { Response } from "express";
import { VehicleType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { routeBetween, routeThrough, GeoPoint } from "../utils/geo";
import { estimateFare, currentSurge } from "../utils/pricing";
import { offerBookingToDrivers } from "../services/matching";
import { notify } from "../services/notifications";
import { emitToBooking } from "../services/realtime";

const bookingInclude: Prisma.BookingInclude = {
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

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      pickupLocation,
      pickupLat,
      pickupLng,
      dropoffLocation,
      dropoffLat,
      dropoffLng,
      vehicleType,
      scheduledTime,
      stops,
    } = req.body;

    if (
      !pickupLocation ||
      !dropoffLocation ||
      !vehicleType ||
      pickupLat == null ||
      pickupLng == null ||
      dropoffLat == null ||
      dropoffLng == null
    )
      return res.status(400).json({ message: "Missing required booking fields" });

    if (!Object.values(VehicleType).includes(vehicleType))
      return res.status(400).json({ message: "Invalid vehicle type" });

    const points: GeoPoint[] = [
      { lat: Number(pickupLat), lng: Number(pickupLng) },
      ...(Array.isArray(stops)
        ? stops.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
        : []),
      { lat: Number(dropoffLat), lng: Number(dropoffLng) },
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
        userId: req.auth!.id,
        pickupLocation,
        pickupLat: Number(pickupLat),
        pickupLng: Number(pickupLng),
        dropoffLocation,
        dropoffLat: Number(dropoffLat),
        dropoffLng: Number(dropoffLng),
        vehicleType,
        estimatedDistance: distanceKm,
        estimatedDuration: durationMin,
        estimatedCost: fare.total,
        status: "PENDING",
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        stops: Array.isArray(stops)
          ? {
              create: [
                {
                  orderIndex: 0,
                  location: pickupLocation,
                  lat: Number(pickupLat),
                  lng: Number(pickupLng),
                  stopType: "PICKUP",
                },
                ...stops.map((s: any, i: number) => ({
                  orderIndex: i + 1,
                  location: s.location,
                  lat: Number(s.lat),
                  lng: Number(s.lng),
                  stopType: "WAYPOINT",
                })),
                {
                  orderIndex: stops.length + 1,
                  location: dropoffLocation,
                  lat: Number(dropoffLat),
                  lng: Number(dropoffLng),
                  stopType: "DROP",
                },
              ],
            }
          : undefined,
      },
      include: bookingInclude,
    });

    // Offer to drivers in the background; do not block the response.
    offerBookingToDrivers(booking.id).catch(() => undefined);

    return res.status(201).json({ message: "Booking created", booking });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const listMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.auth!.id },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ bookings });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const getBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const { id, role, driverId } = req.auth!;
    const allowed =
      role === "ADMIN" ||
      booking.userId === id ||
      (booking.driverId && booking.driverId === driverId);
    if (!allowed) return res.status(403).json({ message: "Forbidden" });

    return res.status(200).json({ booking });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.auth!.id)
      return res.status(403).json({ message: "Forbidden" });
    if (["COMPLETED", "CANCELLED"].includes(booking.status))
      return res.status(400).json({ message: `Cannot cancel a ${booking.status} booking` });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
      include: bookingInclude,
    });

    if (booking.driverId) {
      await notify({
        type: "BOOKING_CANCELLED",
        message: `Booking ${booking.id} was cancelled by the customer.`,
        driverId: booking.driverId,
        bookingId: booking.id,
      });
    }
    emitToBooking(booking.id, "booking:update", updated);

    return res.status(200).json({ message: "Booking cancelled", booking: updated });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const rateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { rating } = req.body;
    const value = Number(rating);
    if (!value || value < 1 || value > 5)
      return res.status(400).json({ message: "Rating must be between 1 and 5" });

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.auth!.id)
      return res.status(403).json({ message: "Forbidden" });
    if (booking.status !== "COMPLETED")
      return res.status(400).json({ message: "Only completed bookings can be rated" });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { rating: value },
    });

    if (booking.driverId) {
      const agg = await prisma.booking.aggregate({
        where: { driverId: booking.driverId, rating: { not: null } },
        _avg: { rating: true },
      });
      if (agg._avg.rating)
        await prisma.driver.update({
          where: { id: booking.driverId },
          data: { rating: Number(agg._avg.rating.toFixed(2)) },
        });
    }

    return res.status(200).json({ message: "Thanks for rating", booking: updated });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};
