import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const roleMiddleware = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies['accessToken'];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded: any = jwt.verify(token, process.env.ACCESS_TOKEN_PRIVATE_KEY as string);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
