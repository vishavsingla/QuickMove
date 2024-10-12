import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// List all bookings (admin only)
router.get('/bookings', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany();
    return res.status(200).json(bookings);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error });
  }
});

// Approve a booking (admin only)
router.post('/bookings/:id/approve', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.PENDING },
    });
    return res.status(200).json(updatedBooking);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error });
  }
});
