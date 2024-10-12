import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
  sessionToken?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['cookie'];
  const token = authHeader && authHeader.split('accessToken=')[1];
  console.log(token)
  const tokens = req.headers['cookie']?.split(';');
  const session = tokens?.find(token => token.includes("sessionToken="));
  const sessionToken = session ? session.split('=')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_PRIVATE_KEY as string, (err, user) => {
    if (err) {
      return res.status(200).json({ error: 'Invalid access token' });
    }
    req.user = user;
    next();
  });
};
