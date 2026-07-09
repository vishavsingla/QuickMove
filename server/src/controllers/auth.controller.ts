import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { VehicleType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../utils/jwt";
import { AuthRequest } from "../middlewares/auth";

const sanitizeUser = (user: any) => {
  const { hashedPassword, ...rest } = user;
  return rest;
};

const issue = (payload: {
  id: string;
  role: "USER" | "DRIVER" | "ADMIN";
  driverId?: string;
}) => signAccessToken(payload);

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password || !phoneNumber)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phoneNumber, hashedPassword, role: "USER" },
    });

    const token = issue({ id: user.id, role: "USER" });
    return res
      .status(201)
      .json({ message: "Registered", token, user: sanitizeUser(user), role: "USER" });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      licenseNumber,
      vehicleType,
      licensePlate,
      city,
      area,
      make,
      model,
      year,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phoneNumber ||
      !licenseNumber ||
      !vehicleType ||
      !licensePlate ||
      !city ||
      !area
    )
      return res.status(400).json({ message: "All fields are required" });

    if (!Object.values(VehicleType).includes(vehicleType))
      return res.status(400).json({ message: "Invalid vehicle type" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phoneNumber, hashedPassword, role: "DRIVER" },
      });
      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          name,
          email,
          phoneNumber,
          licenseNumber,
          vehicleType,
          licensePlate,
          city,
          area,
          status: "PENDING",
        },
      });
      await tx.vehicle.create({
        data: {
          driverId: driver.id,
          vehicleType,
          licensePlate,
          make: make ?? null,
          model: model ?? null,
          year: year ? Number(year) : null,
          status: "PENDING",
        },
      });
      return { user, driver };
    });

    const token = issue({
      id: result.user.id,
      role: "DRIVER",
      driverId: result.driver.id,
    });
    return res.status(201).json({
      message: "Driver registered. Awaiting admin approval.",
      token,
      user: sanitizeUser(result.user),
      driver: result.driver,
      role: "DRIVER",
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber, adminSecret } = req.body;
    if (adminSecret !== (process.env.ADMIN_SIGNUP_SECRET || "quickmove-admin"))
      return res.status(403).json({ message: "Invalid admin secret" });
    if (!name || !email || !password || !phoneNumber)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phoneNumber, hashedPassword, role: "ADMIN" },
      });
      await tx.admin.create({ data: { userId: user.id } });
      return user;
    });

    const token = issue({ id: result.id, role: "ADMIN" });
    return res
      .status(201)
      .json({ message: "Admin registered", token, user: sanitizeUser(result), role: "ADMIN" });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { driver: true },
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = issue({
      id: user.id,
      role: user.role,
      driverId: user.driver?.id,
    });
    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
      role: user.role,
      driverId: user.driver?.id ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.id },
      include: { driver: { include: { vehicles: true } } },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user: sanitizeUser(user), role: user.role });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};
