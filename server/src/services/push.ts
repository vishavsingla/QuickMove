/** Web push delivery stub — logs intent; wire FCM/VAPID in production. */
import { prisma } from "../lib/prisma";

export const sendPushStub = async (
  userId: string,
  title: string,
  body: string
): Promise<{ sent: number }> => {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0 };
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[push stub] user=${userId} subs=${subs.length} title=${title} body=${body}`
    );
  }
  return { sent: subs.length };
};
