import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const roleMiddleware = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    

    
    try {
      const cookie = req.rawHeaders.at(-1);
    const cookiesArray = cookie?.split(';').find(cookie => cookie.trim().startsWith('accessToken='));
    const token = cookiesArray ? cookiesArray.split('=')[1].trim() : null;
      console.log(cookie);
      if (!token) {
        return res.status(200).json({ message: "No token provided" });
      }
  
      const user = await prisma.session.findFirst({ where: { accessToken: token }, include: { user: true } });
    
      if (!user || !roles.includes(user.user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }
  
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
