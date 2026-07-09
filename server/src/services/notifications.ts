import { prisma } from "../lib/prisma";
import { emitToUser, emitToDriver } from "./realtime";
import { sendPushStub } from "./push";

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

  let pushUserId = input.userId;
  if (!pushUserId && input.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: input.driverId },
      select: { userId: true },
    });
    pushUserId = driver?.userId;
  }
  if (pushUserId) {
    await sendPushStub(pushUserId, input.type, input.message).catch(() => undefined);
  }

  return notification;
};
