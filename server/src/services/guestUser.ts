import crypto from "crypto";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ensureWallet } from "./payments";

export const normalizePhone = (phone: string) => phone.replace(/\s+/g, "").trim();

const guestEmailForPhone = (phone: string) =>
  `guest+${phone.replace(/\D/g, "")}@quickmove.local`;

export const findOrCreateGuestUser = async (params: {
  name: string;
  phoneNumber: string;
  email?: string;
}): Promise<{ user: User; isNewUser: boolean }> => {
  const phone = normalizePhone(params.phoneNumber);
  if (!phone || phone.length < 8)
    throw new Error("Invalid phone number");

  const existing = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  if (existing) {
    if (!existing.name && params.name.trim()) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { name: params.name.trim() },
      });
      return { user: updated, isNewUser: false };
    }
    return { user: existing, isNewUser: false };
  }

  let email = params.email?.trim() || guestEmailForPhone(phone);
  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    email = `guest+${Date.now()}+${phone.replace(/\D/g, "")}@quickmove.local`;
  }

  const tempPassword = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name: params.name.trim(),
      email,
      phoneNumber: phone,
      hashedPassword,
      role: "USER",
    },
  });
  await ensureWallet(user.id);
  return { user, isNewUser: true };
};
