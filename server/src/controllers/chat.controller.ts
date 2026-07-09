import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

const canAccessBooking = async (bookingId: string, auth: AuthRequest["auth"]) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  const allowed =
    auth?.role === "ADMIN" ||
    booking.userId === auth?.id ||
    (booking.driverId && booking.driverId === auth?.driverId);
  return allowed ? booking : null;
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  const booking = await canAccessBooking(req.params.id, req.auth);
  if (!booking) return res.status(403).json({ message: "Forbidden" });
  const messages = await prisma.chatMessage.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return res.status(200).json({ messages });
};

export const saveMessage = async (
  bookingId: string,
  senderUserId: string,
  senderRole: string,
  body: string
) => {
  return prisma.chatMessage.create({
    data: { bookingId, senderUserId, senderRole, body },
  });
};
