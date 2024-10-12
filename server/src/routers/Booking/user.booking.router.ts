
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { PrismaClient } from '@prisma/client';
import { extractSessionToken, fetchUserFromSession } from '../../controllers/authentication/user.auth.controller';


const prisma = new PrismaClient();
const router = Router();

router.post('/user/bookings', authMiddleware, roleMiddleware(['USER']), async (req: Request, res: Response) => {
    const { pickupLocation, dropoffLocation } = req.body;
    const user = await fetchUserFromSession(req, res);
  
    if (!user || !user.id) {
      return res.status(400).json({ message: 'User not found or user ID is missing' });
    }

    try {
      const newBooking = await prisma.booking.create({
        data: {
          pickupLocation,
          dropoffLocation,
          pickupLat: req.body.pickupLat,
          pickupLng: req.body.pickupLng,
          dropoffLat: req.body.dropoffLat,
          dropoffLng: req.body.dropoffLng,
          userId: user.id,
          status: 'PENDING',
          estimatedCost: 0, // or calculate the estimated cost
        },
      });
      return res.status(200).json(newBooking);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error', error });
    }
  });
  
  // View all bookings made by the user
  router.get('/user/bookings', authMiddleware, roleMiddleware(['USER']), async (req: Request, res: Response) => {
    const user = await fetchUserFromSession(req, res);
  
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          userId: user?.id,
        },
      });
      return res.status(200).json(bookings);
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error', error });
    }
  });
  