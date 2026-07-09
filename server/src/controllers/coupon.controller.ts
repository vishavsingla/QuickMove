import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { validateCoupon } from "../services/coupons";

export const validate = async (req: AuthRequest, res: Response) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || orderAmount == null)
      return res.status(400).json({ message: "code and orderAmount required" });

    const result = await validateCoupon(
      code,
      Number(orderAmount),
      req.auth!.id
    );
    return res.status(200).json({
      valid: true,
      code: result.coupon.code,
      description: result.coupon.description,
      discount: result.discount,
      finalAmount: result.finalAmount,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message, valid: false });
  }
};

export const listCoupons = async (_req: AuthRequest, res: Response) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return res.status(200).json({ coupons });
};

export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      validUntil,
    } = req.body;
    if (!code || !discountType || discountValue == null)
      return res.status(400).json({ message: "code, discountType, discountValue required" });
    if (!["PERCENT", "FLAT"].includes(discountType))
      return res.status(400).json({ message: "discountType must be PERCENT or FLAT" });

    const coupon = await prisma.coupon.create({
      data: {
        code: String(code).toUpperCase().trim(),
        description,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount != null ? Number(minOrderAmount) : 0,
        maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
        usageLimit: usageLimit != null ? Number(usageLimit) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
    return res.status(201).json({ coupon });
  } catch (err: any) {
    if (err.code === "P2002")
      return res.status(409).json({ message: "Coupon code already exists" });
    return res.status(500).json({ message: err.message });
  }
};

export const toggleCoupon = async (req: AuthRequest, res: Response) => {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { isActive: !coupon.isActive },
  });
  return res.status(200).json({ coupon: updated });
};
