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

export const subscribePush = async (req: AuthRequest, res: Response) => {
  const userId = req.auth!.id;
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!endpoint?.trim())
    return res.status(400).json({ message: "endpoint required" });

  const sub = await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint: endpoint.trim() } },
    create: {
      userId,
      endpoint: endpoint.trim(),
      p256dh: keys?.p256dh,
      auth: keys?.auth,
    },
    update: { p256dh: keys?.p256dh, auth: keys?.auth },
  });
  return res.status(200).json({ message: "Push subscription saved", subscription: sub });
};

export const unsubscribePush = async (req: AuthRequest, res: Response) => {
  const userId = req.auth!.id;
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint?.trim())
    return res.status(400).json({ message: "endpoint required" });
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint: endpoint.trim() },
  });
  return res.status(200).json({ message: "Unsubscribed" });
};

export const pushStatus = async (req: AuthRequest, res: Response) => {
  const count = await prisma.pushSubscription.count({
    where: { userId: req.auth!.id },
  });
  return res.status(200).json({ enabled: count > 0, subscriptions: count });
};
