import { Router } from 'express';

import { authMiddleware } from '../../middlewares/authMiddleware';
import { getNotificationsForDriver, getNotificationsForUser, markNotificationAsRead } from '../../controllers/notification/notification.controller';


const router = Router();

router.get('/user/:userId', authMiddleware, getNotificationsForUser);
router.get('/driver/:driverId', authMiddleware, getNotificationsForDriver);
router.put('/:notificationId/read', authMiddleware, markNotificationAsRead);

export default router;