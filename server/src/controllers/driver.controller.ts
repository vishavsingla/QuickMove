import { Response } from "express";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { notify } from "../services/notifications";
import { emitToBooking, emitToUser } from "../services/realtime";
import { ensureWallet } from "../services/payments";

const driverId = (req: AuthRequest) => req.auth?.driverId;

const bookingInclude = {
  user: { select: { id: true, name: true, phoneNumber: true } },
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
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { vehicles: true },
  });
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  return res.status(200).json({ driver });
};

export const setAvailability = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const driver = await prisma.driver.update({
    where: { id },
    data: { isAvailable: Boolean(req.body.isAvailable) },
  });
  return res.status(200).json({ driver });
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const { lat, lng } = req.body;
  if (lat == null || lng == null)
    return res.status(400).json({ message: "lat and lng required" });
  const driver = await prisma.driver.update({
    where: { id },
    data: { currentLat: Number(lat), currentLng: Number(lng) },
  });
  return res.status(200).json({ driver });
};

export const listOffers = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  if (driver.status !== "APPROVED")
    return res.status(200).json({ offers: [], message: "Account pending approval" });

  const offers = await prisma.booking.findMany({
    where: { status: "PENDING", vehicleType: driver.vehicleType, driverId: null },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ offers });
};

export const listMyJobs = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const jobs = await prisma.booking.findMany({
    where: { driverId: id },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ jobs });
};

export const acceptBooking = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });

  // Atomic claim: only succeeds if still PENDING and unassigned.
  const claim = await prisma.booking.updateMany({
    where: { id: req.params.id, status: "PENDING", driverId: null },
    data: { status: "ACCEPTED", driverId: id },
  });
  if (claim.count === 0)
    return res.status(409).json({ message: "Booking no longer available" });

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });

  await notify({
    type: "BOOKING_ACCEPTED",
    message: "A driver accepted your booking and is on the way.",
    userId: booking!.userId,
    bookingId: booking!.id,
  });
  emitToUser(booking!.userId, "booking:update", booking);
  emitToBooking(booking!.id, "booking:update", booking);

  return res.status(200).json({ message: "Booking accepted", booking });
};

export const rejectBooking = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  // A rejection only removes the offer for this driver; the booking stays
  // available for others. Nothing to persist for the demo.
  return res.status(200).json({ message: "Offer dismissed" });
};

const NEXT_STATUS: Record<string, BookingStatus[]> = {
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

const STATUS_MESSAGE: Record<string, string> = {
  ARRIVED: "Your driver has arrived at the pickup location.",
  IN_PROGRESS: "Your move is in progress.",
  COMPLETED: "Your move is complete. Thanks for using QuickMove!",
  CANCELLED: "Your driver cancelled the booking.",
};

export const updateJobStatus = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const { status } = req.body as { status: BookingStatus };

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.driverId !== id)
    return res.status(403).json({ message: "Not your booking" });

  const allowed = NEXT_STATUS[booking.status] ?? [];
  if (!allowed.includes(status))
    return res
      .status(400)
      .json({ message: `Cannot move from ${booking.status} to ${status}` });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status },
    include: bookingInclude,
  });

  if (status === "COMPLETED") {
    await prisma.driver.update({
      where: { id },
      data: { totalTrips: { increment: 1 }, isAvailable: true },
    });
  }

  await notify({
    type: "RIDE_UPDATE",
    message: STATUS_MESSAGE[status] ?? `Status: ${status}`,
    userId: booking.userId,
    bookingId: booking.id,
  });
  emitToUser(booking.userId, "booking:update", updated);
  emitToBooking(booking.id, "booking:update", updated);

  return res.status(200).json({ message: "Status updated", booking: updated });
};

export const getEarnings = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return res.status(404).json({ message: "Driver not found" });

  const wallet = await ensureWallet(driver.userId);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id, description: "Trip earnings" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);
  const weekEarnings = transactions
    .filter((t) => t.createdAt >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const bookingIds = transactions
    .map((t) => t.reference)
    .filter((r): r is string => !!r);
  const bookings =
    bookingIds.length > 0
      ? await prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          select: {
            id: true,
            pickupLocation: true,
            dropoffLocation: true,
            estimatedCost: true,
            status: true,
            createdAt: true,
          },
        })
      : [];
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));

  const pendingTrips = await prisma.booking.count({
    where: {
      driverId: id,
      status: "COMPLETED",
      paymentStatus: "UNPAID",
    },
  });

  return res.status(200).json({
    summary: {
      balance: wallet.balance,
      totalEarnings,
      weekEarnings,
      tripCount: transactions.length,
      pendingTrips,
      commissionRate: 0.1,
    },
    transactions: transactions.map((t) => ({
      ...t,
      booking: t.reference ? bookingMap.get(t.reference) ?? null : null,
    })),
  });
};
