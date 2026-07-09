import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { notify } from "../services/notifications";

export const listDrivers = async (_req: AuthRequest, res: Response) => {
  const drivers = await prisma.driver.findMany({
    include: { vehicles: true, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ drivers });
};

export const setDriverStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status: string };
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ message: "Driver not found" });

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.driver.update({
      where: { id: driver.id },
      data: { status },
    });
    await tx.vehicle.updateMany({
      where: { driverId: driver.id },
      data: { status: status === "APPROVED" ? "APPROVED" : status },
    });
    return d;
  });

  await notify({
    type: "DRIVER_STATUS",
    message:
      status === "APPROVED"
        ? "Your driver account has been approved. You can now accept jobs."
        : `Your driver account status is now ${status}.`,
    driverId: driver.id,
  });

  return res.status(200).json({ message: "Driver updated", driver: updated });
};

export const listBookings = async (_req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { id: true, name: true } },
      driver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return res.status(200).json({ bookings });
};

export const listUsers = async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ users });
};

export const stats = async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalDrivers,
    pendingDrivers,
    totalBookings,
    completed,
    revenueAgg,
    byStatus,
    byVehicle,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { status: "PENDING" } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED" },
      _sum: { estimatedCost: true },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["vehicleType"], _count: { _all: true } }),
  ]);

  return res.status(200).json({
    totals: {
      users: totalUsers,
      drivers: totalDrivers,
      pendingDrivers,
      bookings: totalBookings,
      completed,
      revenue: revenueAgg._sum.estimatedCost ?? 0,
    },
    bookingsByStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
    bookingsByVehicle: byVehicle.map((v) => ({
      vehicleType: v.vehicleType,
      count: v._count._all,
    })),
  });
};
