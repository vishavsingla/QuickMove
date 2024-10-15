import { Router, Request, Response } from 'express';
import {
    signUpController,
    loginController,
    logOutController,
    refreshAccessTokenController,
    checkValidSession,
    getUserDetails,
} from '../../controllers/authentication/user.auth.controller';
const UserAuthRouter = Router();

UserAuthRouter.post('/signup', signUpController);
UserAuthRouter.post('/login', loginController);
UserAuthRouter.post('/logout/:id?', logOutController);
UserAuthRouter.post('/refresh-token', refreshAccessTokenController);
// UserAuthRouter.get('/check-session/:id?', authMiddleware, checkValidSession);
UserAuthRouter.get('/check-session/:sessionToken?', getUserDetails);
UserAuthRouter.get('/user/:id?', getUserDetails);

export default UserAuthRouter; 


