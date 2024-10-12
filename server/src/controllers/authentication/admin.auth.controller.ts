import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const adminSignUpController = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    const existingAdmin = await prisma.user.findUnique({ where: { email } });
    if (existingAdmin) return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        phoneNumber,
        role: 'ADMIN', // Ensure role is ADMIN
        Admin: { create: {} }, // Associate with Admin model
      },
    });

    return res.status(201).json({ message: "Admin registered", newAdmin });
  } catch (error) {
    return res.status(500).json({ message: "Error registering admin", error });
  }
};

export const adminLoginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.user.findUnique({ where: { email, role: 'ADMIN' } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.hashedPassword);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.ACCESS_TOKEN_PRIVATE_KEY as string);
    return res.status(200).json({ message: "Admin login successful", token });
  } catch (error) {
    return res.status(500).json({ message: "Error logging in", error });
  }
};
