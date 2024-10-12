import { Router } from 'express';
import { adminLoginController, adminSignUpController } from '../../controllers/authentication/admin.auth.controller';
import { logOutController, refreshAccessTokenController } from '../../controllers/authentication/user.auth.controller';
import { roleMiddleware } from '../../middlewares/roleMiddleware';


const DriverAuthRouter = Router();

DriverAuthRouter.post('/signup', adminSignUpController);
DriverAuthRouter.post('/login', adminLoginController);
DriverAuthRouter.post('/logout', logOutController);
DriverAuthRouter.post('/refresh-token', refreshAccessTokenController);

DriverAuthRouter.use(roleMiddleware(['ADMIN'])); // Only admins can access following routes

// Define other admin-only routes here
DriverAuthRouter.get('/dashboard', (req, res) => res.json({ message: "Admin dashboard" }));

export default DriverAuthRouter;
