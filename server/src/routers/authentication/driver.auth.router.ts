import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
  driverSignUpController,
  driverLoginController,
  getDriverById,
  getAllDrivers,
  addVehicleByDriver,
} from '../../controllers/authentication/driver.auth.controller';


const router = Router();

router.post('/vehicle', authMiddleware, addVehicleByDriver);
router.post('/register', driverSignUpController);
router.post('/login', driverLoginController);
router.get('/:id', authMiddleware, getDriverById);
router.get('/', authMiddleware, getAllDrivers);

export default router;