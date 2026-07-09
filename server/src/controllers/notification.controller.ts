import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

export const listMine = async (req: AuthRequest, res: Response) => {
  const { id, driverId } = req.auth!;
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: id }, ...(driverId ? [{ driverId }] : [])] },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.isRead).length;
  return res.status(200).json({ notifications, unread });
};

export const markRead = async (req: AuthRequest, res: Response) => {
  const { id, driverId } = req.auth!;
  const where =
    req.params.id === "all"
      ? { OR: [{ userId: id }, ...(driverId ? [{ driverId }] : [])] }
      : { id: req.params.id };
  await prisma.notification.updateMany({ where, data: { isRead: true } });
  return res.status(200).json({ message: "Marked as read" });
};
