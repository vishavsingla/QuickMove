import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

export const listAddresses = async (req: AuthRequest, res: Response) => {
  const addresses = await prisma.savedAddress.findMany({
    where: { userId: req.auth!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return res.status(200).json({ addresses });
};

export const createAddress = async (req: AuthRequest, res: Response) => {
  const { label, address, lat, lng, isDefault } = req.body;
  if (!label || !address || lat == null || lng == null)
    return res.status(400).json({ message: "label, address, lat, lng required" });

  if (isDefault) {
    await prisma.savedAddress.updateMany({
      where: { userId: req.auth!.id },
      data: { isDefault: false },
    });
  }

  const saved = await prisma.savedAddress.create({
    data: {
      userId: req.auth!.id,
      label,
      address,
      lat: Number(lat),
      lng: Number(lng),
      isDefault: Boolean(isDefault),
    },
  });
  return res.status(201).json({ address: saved });
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  const existing = await prisma.savedAddress.findUnique({
    where: { id: req.params.id },
  });
  if (!existing || existing.userId !== req.auth!.id)
    return res.status(404).json({ message: "Address not found" });
  await prisma.savedAddress.delete({ where: { id: req.params.id } });
  return res.status(200).json({ message: "Deleted" });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, phoneNumber } = req.body;
  const user = await prisma.user.update({
    where: { id: req.auth!.id },
    data: {
      ...(name ? { name } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true },
  });
  return res.status(200).json({ user });
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
      _count: { select: { bookings: true, savedAddresses: true } },
    },
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.status(200).json({ user });
};
