import { Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();
// Fetch notifications for a user
export const getNotificationsForUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId }
    });

    res.status(200).json(notifications);
  } catch (error:any) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Fetch notifications for a driver
export const getNotificationsForDriver = async (req: Request, res: Response) => {
  const { driverId } = req.params;

  try {
    const notifications = await prisma.notification.findMany({
      where: { driverId }
    });

    res.status(200).json(notifications);
  } catch (error:any) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error:any) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};
