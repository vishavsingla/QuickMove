import { Request, Response } from "express";
import { VehicleType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { bookingInclude, createBookingRecord } from "../services/bookingCreate";
import { findOrCreateGuestUser, normalizePhone } from "../services/guestUser";
import { createSession } from "../services/sessions";
import { verifyPhoneVerificationToken } from "../utils/jwt";

const sanitizeUser = (user: { hashedPassword?: string; [key: string]: unknown }) => {
  const clone = { ...user };
  delete clone.hashedPassword;
  return clone;
};

const parseBookingBody = (body: Record<string, unknown>) => {
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
    couponCode,
  } = body;

  if (
    !pickupLocation ||
    !dropoffLocation ||
    !vehicleType ||
    pickupLat == null ||
    pickupLng == null ||
    dropoffLat == null ||
    dropoffLng == null
  )
    return { error: "Missing required booking fields" as const };

  if (!Object.values(VehicleType).includes(vehicleType as VehicleType))
    return { error: "Invalid vehicle type" as const };

  return {
    pickupLocation: String(pickupLocation),
    pickupLat: Number(pickupLat),
    pickupLng: Number(pickupLng),
    dropoffLocation: String(dropoffLocation),
    dropoffLat: Number(dropoffLat),
    dropoffLng: Number(dropoffLng),
    vehicleType: vehicleType as VehicleType,
    scheduledTime: scheduledTime ? String(scheduledTime) : undefined,
    stops: Array.isArray(stops) ? stops : undefined,
    couponCode: couponCode ? String(couponCode) : undefined,
  };
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = parseBookingBody(req.body);
    if ("error" in parsed) return res.status(400).json({ message: parsed.error });

    try {
      const booking = await createBookingRecord({
        userId: req.auth!.id,
        ...parsed,
      });
      return res.status(201).json({ message: "Booking created", booking });
    } catch (err: any) {
      if (parsed.couponCode) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const createGuestBooking = async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, phoneVerificationToken } = req.body;
    if (!name?.trim() || !phoneNumber?.trim())
      return res.status(400).json({ message: "Name and phone number are required" });

    const normalizedPhone = normalizePhone(String(phoneNumber));
    if (phoneVerificationToken) {
      const verified = verifyPhoneVerificationToken(String(phoneVerificationToken));
      if (!verified || verified.phone !== normalizedPhone) {
        return res.status(400).json({ message: "Phone verification required or expired" });
      }
    }

    const parsed = parseBookingBody(req.body);
    if ("error" in parsed) return res.status(400).json({ message: parsed.error });

    const { user, isNewUser } = await findOrCreateGuestUser({
      name: String(name),
      phoneNumber: String(phoneNumber),
      email: email ? String(email) : undefined,
    });

    if (phoneVerificationToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, phoneNumber: normalizedPhone },
      });
    }

    try {
      const booking = await createBookingRecord({
        userId: user.id,
        ...parsed,
      });

      const { accessToken, refreshToken } = await createSession({
        id: user.id,
        role: "USER",
      });

      return res.status(201).json({
        message: isNewUser
          ? "Booking created. Log in with your phone to manage bookings later."
          : "Booking created",
        booking,
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user),
        role: "USER",
        isNewUser,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const trackGuestBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = String(req.query.bookingId || "");
    const phoneNumber = normalizePhone(String(req.query.phoneNumber || ""));

    if (!bookingId || !phoneNumber)
      return res.status(400).json({ message: "bookingId and phoneNumber are required" });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const user = await prisma.user.findUnique({ where: { id: booking.userId } });
    if (!user || normalizePhone(user.phoneNumber) !== phoneNumber)
      return res.status(403).json({ message: "Phone number does not match this booking" });

    return res.status(200).json({ booking });
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
    const { reason } = req.body as { reason?: string };
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.userId !== req.auth!.id)
      return res.status(403).json({ message: "Forbidden" });
    if (["COMPLETED", "CANCELLED"].includes(booking.status))
      return res.status(400).json({ message: `Cannot cancel a ${booking.status} booking` });

    const { refundBookingToWallet } = await import("../services/payments");
    const refundAmount = await refundBookingToWallet(req.auth!.id, booking.id).catch(
      () => null
    );

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelReason: reason?.trim() || null,
      },
      include: bookingInclude,
    });

    if (booking.driverId) {
      const { notify } = await import("../services/notifications");
      await notify({
        type: "BOOKING_CANCELLED",
        message: `Booking ${booking.id} was cancelled by the customer.`,
        driverId: booking.driverId,
        bookingId: booking.id,
      });
    }
    const { emitToBooking } = await import("../services/realtime");
    emitToBooking(booking.id, "booking:update", updated);

    return res.status(200).json({
      message: refundAmount
        ? `Booking cancelled. ₹${refundAmount} refunded to wallet.`
        : "Booking cancelled",
      booking: updated,
      refundAmount,
    });
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
