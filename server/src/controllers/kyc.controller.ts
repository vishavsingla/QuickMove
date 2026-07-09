import crypto from "crypto";
import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";

const driverId = (req: AuthRequest) => req.auth?.driverId;

/** Stub upload: stores a reference URL without persisting binary content. */
const stubDocUrl = (driverId: string, kind: string, fileName: string) =>
  `stub://kyc/${driverId}/${kind}/${crypto.randomBytes(6).toString("hex")}/${encodeURIComponent(fileName || "document")}`;

export const getKyc = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: {
      kycStatus: true,
      licenseDocUrl: true,
      idDocUrl: true,
      kycSubmittedAt: true,
      kycNote: true,
    },
  });
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  return res.status(200).json({ kyc: driver });
};

export const submitKyc = async (req: AuthRequest, res: Response) => {
  const id = driverId(req);
  if (!id) return res.status(400).json({ message: "Not a driver account" });

  const { licenseFileName, idFileName } = req.body as {
    licenseFileName?: string;
    idFileName?: string;
  };
  if (!licenseFileName || !idFileName)
    return res.status(400).json({ message: "licenseFileName and idFileName required" });

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  if (driver.kycStatus === "VERIFIED")
    return res.status(400).json({ message: "KYC already verified" });

  const updated = await prisma.driver.update({
    where: { id },
    data: {
      licenseDocUrl: stubDocUrl(id, "license", licenseFileName),
      idDocUrl: stubDocUrl(id, "id", idFileName),
      kycStatus: "SUBMITTED",
      kycSubmittedAt: new Date(),
      kycNote: null,
    },
    select: {
      kycStatus: true,
      licenseDocUrl: true,
      idDocUrl: true,
      kycSubmittedAt: true,
      kycNote: true,
    },
  });

  return res.status(200).json({ message: "KYC documents submitted", kyc: updated });
};

export const reviewKyc = async (req: AuthRequest, res: Response) => {
  const { status, note } = req.body as { status: string; note?: string };
  if (!["VERIFIED", "REJECTED"].includes(status))
    return res.status(400).json({ message: "status must be VERIFIED or REJECTED" });

  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ message: "Driver not found" });
  if (driver.kycStatus !== "SUBMITTED")
    return res.status(400).json({ message: "Driver has not submitted KYC" });

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { kycStatus: status, kycNote: note ?? null },
  });

  return res.status(200).json({ message: "KYC reviewed", driver: updated });
};
