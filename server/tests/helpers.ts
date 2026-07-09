import { prisma } from "../src/lib/prisma";

/** Wipe all tables in FK-safe order. Call in beforeEach for isolation. */
export const resetDb = async () => {
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.bookingStop.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.savedAddress.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
};

export const disconnect = async () => {
  await prisma.$disconnect();
};
