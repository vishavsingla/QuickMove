import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { PrismaClient } from '@prisma/client';
import { extractSessionToken, fetchUserFromSession } from '../../controllers/authentication/user.auth.controller';

const prisma = new PrismaClient();
const router = Router();

router.get('/driver/bookings', authMiddleware, roleMiddleware(['DRIVER']), async (req: Request, res: Response) => {
    const user = await fetchUserFromSession(req,res);
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          driverId: user?.id,
        },
      });
      return res.status(200).json(bookings);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error', error });
    }
  });
  
  // Update the status of a booking
  router.put('/driver/bookings/:id/status', authMiddleware, roleMiddleware(['DRIVER']), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
  
    try {
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status },
      });
      return res.status(200).json(updatedBooking);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error', error });
    }
  });
  