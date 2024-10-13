import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getAllDrivers,
  approveDriver,
  rejectDriver,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getAllBookings,
  cancelBooking,
  assignBooking,
  getFleetData,
  getAnalytics,
  getHourlyAnalytics,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getAreaAnalytics,
  approveVehicle,
} from '../../controllers/admin/admin.controller';
import { roleMiddleware } from '../../middlewares/roleMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

router.get('/drivers', roleMiddleware(['ADMIN']), getAllDrivers);
router.post('/drivers/approve', roleMiddleware(['ADMIN']), approveDriver);
router.post('/drivers/reject', roleMiddleware(['ADMIN']), rejectDriver);

router.post('/vehicles/approve', roleMiddleware(['ADMIN']), approveVehicle);
router.post('/vehicles', roleMiddleware(['ADMIN']), addVehicle);
router.put('/vehicles/:id', roleMiddleware(['ADMIN']), updateVehicle);
router.delete('/vehicles/:id', roleMiddleware(['ADMIN']), deleteVehicle);

router.get('/bookings', roleMiddleware(['ADMIN']), getAllBookings);
router.post('/bookings/cancel', roleMiddleware(['ADMIN']), cancelBooking);
router.post('/bookings/assign', roleMiddleware(['ADMIN']), assignBooking);

router.get('/fleet', roleMiddleware(['ADMIN']), getFleetData);
router.get('/analytics', roleMiddleware(['ADMIN']), getAnalytics);
router.get('/analytics/hourly/:date', roleMiddleware(['ADMIN']), getHourlyAnalytics);
router.get('/analytics/daily/:date', roleMiddleware(['ADMIN']), getDailyAnalytics);
router.get('/analytics/weekly/:date', roleMiddleware(['ADMIN']), getWeeklyAnalytics);
router.get('/analytics/monthly/:date', roleMiddleware(['ADMIN']), getMonthlyAnalytics);
router.get('/analytics/yearly/:date', roleMiddleware(['ADMIN']), getYearlyAnalytics);
router.get('/analytics/area/:area', roleMiddleware(['ADMIN']), getAreaAnalytics);

export default router;

