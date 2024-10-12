import { Router } from 'express';
import { adminLoginController, adminSignUpController } from '../../controllers/authentication/admin.auth.controller';
import { logOutController, refreshAccessTokenController } from '../../controllers/authentication/user.auth.controller';
import { roleMiddleware } from '../../middlewares/roleMiddleware';


const AdminAuthRouter = Router();

AdminAuthRouter.post('/signup', adminSignUpController);
AdminAuthRouter.post('/login', adminLoginController);
AdminAuthRouter.post('/logout', logOutController);
AdminAuthRouter.post('/refresh-token', refreshAccessTokenController);

AdminAuthRouter.use(roleMiddleware(['ADMIN'])); // Only admins can access following routes

// Define other admin-only routes here
AdminAuthRouter.get('/dashboard', (req, res) => res.json({ message: "Admin dashboard" }));

export default AdminAuthRouter;
