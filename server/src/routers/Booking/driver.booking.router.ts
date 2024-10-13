import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
  acceptBooking,
  rejectBooking,
  updateRideStatus,
  cancelRide,
  trackDriverLocation
} from '../../controllers/booking/driver.booking.controller';

const router = Router();

router.post('/accept', authMiddleware, acceptBooking);
router.post('/reject', authMiddleware, rejectBooking);
router.post('/update-status', authMiddleware, updateRideStatus);
router.post('/cancel', authMiddleware, cancelRide);

export default router;