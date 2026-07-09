import { prisma } from "../lib/prisma";
import { emitToUser, emitToDriver } from "./realtime";

interface NotifyInput {
  type: string;
  message: string;
  userId?: string;
  driverId?: string;
  bookingId?: string;
}

export const notify = async (input: NotifyInput) => {
  const notification = await prisma.notification.create({ data: input });
  if (input.userId) emitToUser(input.userId, "notification", notification);
  if (input.driverId) emitToDriver(input.driverId, "notification", notification);
  return notification;
};
