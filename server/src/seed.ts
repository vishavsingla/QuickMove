import bcrypt from "bcrypt";
import { PrismaClient, VehicleType } from "@prisma/client";

const prisma = new PrismaClient();

// Central Bangalore-ish coordinates used as demo driver positions.
const BASE_LAT = 12.9716;
const BASE_LNG = 77.5946;

const DRIVERS: Array<{
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  plate: string;
  license: string;
  latOffset: number;
  lngOffset: number;
}> = [
  { name: "Ravi Kumar", email: "ravi.driver@quickmove.dev", phone: "+919000000101", vehicleType: "BIKE", plate: "KA01AB1111", license: "DL-BIKE-1", latOffset: 0.01, lngOffset: 0.01 },
  { name: "Suresh Rao", email: "suresh.driver@quickmove.dev", phone: "+919000000102", vehicleType: "CAR", plate: "KA02CD2222", license: "DL-CAR-2", latOffset: -0.012, lngOffset: 0.008 },
  { name: "Manoj Singh", email: "manoj.driver@quickmove.dev", phone: "+919000000103", vehicleType: "TEMPO", plate: "KA03EF3333", license: "DL-TEMPO-3", latOffset: 0.02, lngOffset: -0.015 },
  { name: "Farhan Ali", email: "farhan.driver@quickmove.dev", phone: "+919000000104", vehicleType: "SMALL_TRUCK", plate: "KA04GH4444", license: "DL-TRUCK-4", latOffset: -0.02, lngOffset: -0.02 },
  { name: "Deepak Nair", email: "deepak.driver@quickmove.dev", phone: "+919000000105", vehicleType: "BIG_TRUCK", plate: "KA05IJ5555", license: "DL-TRUCK-5", latOffset: 0.03, lngOffset: 0.02 },
];

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@quickmove.dev" },
    update: {},
    create: {
      name: "QuickMove Admin",
      email: "admin@quickmove.dev",
      phoneNumber: "+919000000001",
      hashedPassword: password,
      role: "ADMIN",
    },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  // Demo customer
  const demoUser = await prisma.user.upsert({
    where: { email: "user@quickmove.dev" },
    update: {},
    create: {
      name: "Demo Customer",
      email: "user@quickmove.dev",
      phoneNumber: "+919000000002",
      hashedPassword: password,
      role: "USER",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: demoUser.id },
    update: { balance: 2000 },
    create: { userId: demoUser.id, balance: 2000 },
  });

  // Approved drivers with live-ish locations
  for (const d of DRIVERS) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name,
        email: d.email,
        phoneNumber: d.phone,
        hashedPassword: password,
        role: "DRIVER",
      },
    });

    const existing = await prisma.driver.findUnique({ where: { userId: user.id } });
    const driver =
      existing ??
      (await prisma.driver.create({
        data: {
          userId: user.id,
          name: d.name,
          email: d.email,
          phoneNumber: d.phone,
          licenseNumber: d.license,
          vehicleType: d.vehicleType,
          licensePlate: d.plate,
          city: "Bangalore",
          area: "MG Road",
          status: "APPROVED",
          isAvailable: true,
          currentLat: BASE_LAT + d.latOffset,
          currentLng: BASE_LNG + d.lngOffset,
        },
      }));

    const hasVehicle = await prisma.vehicle.findFirst({
      where: { driverId: driver.id },
    });
    if (!hasVehicle) {
      await prisma.vehicle.create({
        data: {
          driverId: driver.id,
          vehicleType: d.vehicleType,
          licensePlate: d.plate,
          status: "APPROVED",
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Admin:  admin@quickmove.dev / password123");
  console.log("User:   user@quickmove.dev / password123");
  console.log("Driver: ravi.driver@quickmove.dev / password123 (and others)");
  console.log("Coupons: WELCOME50 (₹50 off), SAVE20 (20% off, max ₹200)");

  await prisma.coupon.upsert({
    where: { code: "WELCOME50" },
    update: {},
    create: {
      code: "WELCOME50",
      description: "Welcome offer — flat ₹50 off",
      discountType: "FLAT",
      discountValue: 50,
      minOrderAmount: 100,
      usageLimit: 1000,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "SAVE20" },
    update: {},
    create: {
      code: "SAVE20",
      description: "20% off your move",
      discountType: "PERCENT",
      discountValue: 20,
      maxDiscount: 200,
      minOrderAmount: 150,
      usageLimit: 500,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
