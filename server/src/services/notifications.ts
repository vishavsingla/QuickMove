import { prisma } from "../lib/prisma";
import { emitToUser, emitToDriver } from "./realtime";
import { sendPushStub } from "./push";
import { sendEmail } from "./email";
import { sendSms } from "./sms";

interface NotifyInput {
  type: string;
  message: string;
  userId?: string;
  driverId?: string;
  bookingId?: string;
}

const queueOutboundNotifications = async (
  userId: string,
  subject: string,
  message: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phoneNumber: true },
  });
  if (!user) return;

  await Promise.all([
    sendEmail(user.email, subject, `<p>${message}</p>`).catch((err) =>
      console.error("[notify:email]", err.message)
    ),
    user.phoneNumber && !user.phoneNumber.startsWith("+oauth")
      ? sendSms(user.phoneNumber, message).catch((err) =>
          console.error("[notify:sms]", err.message)
        )
      : Promise.resolve(),
  ]);
};

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

export const notifyVerificationSuccess = async (
  userId: string,
  channel: "phone" | "email"
) => {
  const label = channel === "phone" ? "phone number" : "email address";
  return notify({
    type: "VERIFICATION_SUCCESS",
    message: `Your ${label} has been verified successfully.`,
    userId,
  });
};

export const notifyBookingStatusChange = async (params: {
  userId: string;
  bookingId: string;
  status: string;
  message: string;
  type?: string;
}) => {
  await notify({
    type: params.type ?? "BOOKING_STATUS",
    message: params.message,
    userId: params.userId,
    bookingId: params.bookingId,
  });

  await queueOutboundNotifications(
    params.userId,
    `QuickMove booking ${params.status}`,
    params.message
  );
};
