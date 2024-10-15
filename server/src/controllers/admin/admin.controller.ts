import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Admin Signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: 'ADMIN',
        phoneNumber: req.body.phoneNumber, // Add phoneNumber here
      },
    });

    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
      },
    });

    res.status(201).json({ message: 'Admin registered successfully', admin });
  } catch (error) {
    res.status(500).json({ error: 'Error registering admin' });
  }
};

// Admin Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { Admin: true },
    });

    if (!user || !user.Admin) return res.status(404).json({ error: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
};

// Admin Logout
export const logout = (req: Request, res: Response) => {
  res.status(200).json({ message: 'Admin logged out successfully' });
};

// Get All Drivers
export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const drivers = await prisma.driver.findMany();
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching drivers' });
  }
};



// Approve Driver
export const approveDriver = async (req: Request, res: Response) => {
  try {
    const { driverId, newStatus } = req.body;

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: { status: newStatus, isAvailable: true },
    });

    res.status(200).json({ message: 'Driver approved', driver });
  } catch (error) {
    res.status(500).json({ error: 'Error approving driver' });
  }
};

// Approve Vehicle
export const approveVehicle = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'APPROVED' },
    });

    res.status(200).json({ message: 'Vehicle approved', vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Error approving vehicle' });
  }
};


// Add a Vehicle to Fleet
export const addVehicle = async (req: Request, res: Response) => {
  try {
    const { make, model, year, driverId, licensePlate } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        make,
        model,
        year,
        driverId,
        licensePlate,
        vehicleType: req.body.vehicleType,
        driver: {
          connect: { id: driverId }, 
        },
      },
    });

    res.status(201).json({ message: 'Vehicle added to fleet', vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Error adding vehicle' });
  }
};

// Update Vehicle Details
export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { make, model, year, licensePlate } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        make,
        model,
        year,
        licensePlate,
      },
    });

    res.status(200).json({ message: 'Vehicle updated', vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Error updating vehicle' });
  }
};

// Delete Vehicle from Fleet
export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.vehicle.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Vehicle removed from fleet' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting vehicle' });
  }
};

// Get All Bookings
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        driver: true,
        user: true,
      },
    });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

// Cancel a Booking
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    res.status(200).json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ error: 'Error cancelling booking' });
  }
};

// Assign a Booking Manually
export const assignBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId, driverId } = req.body;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverId,
        status: 'ACCEPTED',
      },
    });

    res.status(200).json({ message: 'Booking assigned', booking });
  } catch (error) {
    res.status(500).json({ error: 'Error assigning booking' });
  }
};

// Get Fleet Data
export const getFleetData = async (req: Request, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        driver: true,
      },
    });

    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching fleet data' });
  }
};

// Get Analytics (Basic Version)
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const totalDrivers = await prisma.driver.count();
    const totalUsers = await prisma.user.count();
    const totalBookings = await prisma.booking.count();
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    const cancelledBookings = await prisma.booking.count({ where: { status: 'CANCELLED' } });

    const analytics = {
      totalDrivers,
      totalUsers,
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};

// Get Hourly Analytics
export const getHourlyAnalytics = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching hourly analytics' });
  }
};

// Get Daily Analytics
export const getDailyAnalytics = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching daily analytics' });
  }
};

// Get Weekly Analytics
export const getWeeklyAnalytics = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching weekly analytics' });
  }
};

// Get Monthly Analytics
export const getMonthlyAnalytics = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setMonth(endDate.getMonth() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching monthly analytics' });
  }
};

// Get Yearly Analytics
export const getYearlyAnalytics = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching yearly analytics' });
  }
};

// Get Area-wise Analytics
export const getAreaAnalytics = async (req: Request, res: Response) => {
  try {
    const { area } = req.params;

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { pickupLocation: { contains: area } },
          { dropoffLocation: { contains: area } },
        ],
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => booking.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED').length;

    const analytics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
    };

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching area-wise analytics' });
  }
};