import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
  createBooking,
  getBookingDetails,
  cancelBooking,
  callDriver,
  scheduleBooking
} from '../../controllers/booking/user.booking.controller';

const router = Router();

router.post('/create', authMiddleware, createBooking);
router.get('/:bookingId', authMiddleware, getBookingDetails);
router.post('/cancel', authMiddleware, cancelBooking);
router.post('/call-driver', authMiddleware, callDriver);
router.post('/schedule', authMiddleware, scheduleBooking);

export default router;