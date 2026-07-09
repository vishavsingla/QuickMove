import { Coupon } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const payableAmount = (estimatedCost: number, discountAmount: number) =>
  Math.max(0, Number((estimatedCost - discountAmount).toFixed(2)));

export const computeDiscount = (
  coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscount">,
  orderAmount: number
): number => {
  let discount = 0;
  if (coupon.discountType === "FLAT") {
    discount = coupon.discountValue;
  } else if (coupon.discountType === "PERCENT") {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  }
  return Math.min(Math.round(discount), orderAmount);
};

export const validateCoupon = async (
  code: string,
  orderAmount: number,
  userId: string
) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });
  if (!coupon || !coupon.isActive) throw new Error("Invalid coupon code");

  const now = new Date();
  if (coupon.validFrom > now) throw new Error("Coupon not yet active");
  if (coupon.validUntil && coupon.validUntil < now) throw new Error("Coupon expired");
  if (orderAmount < coupon.minOrderAmount)
    throw new Error(`Minimum order ${coupon.minOrderAmount} required`);
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    throw new Error("Coupon usage limit reached");

  const prior = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, userId },
  });
  if (prior) throw new Error("Coupon already used");

  const discount = computeDiscount(coupon, orderAmount);
  return {
    coupon,
    discount,
    finalAmount: payableAmount(orderAmount, discount),
  };
};

export const applyCouponToBooking = async (
  bookingId: string,
  code: string,
  userId: string
) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) throw new Error("Booking not found");
  if (booking.paymentStatus === "PAID") throw new Error("Booking already paid");
  if (booking.couponCode) throw new Error("Coupon already applied");

  const { coupon, discount } = await validateCoupon(
    code,
    booking.estimatedCost,
    userId
  );

  return prisma.$transaction(async (tx) => {
    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
    await tx.couponRedemption.create({
      data: {
        couponId: coupon.id,
        userId,
        bookingId,
        discount,
      },
    });
    return tx.booking.update({
      where: { id: bookingId },
      data: { couponCode: coupon.code, discountAmount: discount },
    });
  });
};
