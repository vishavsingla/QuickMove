import { Request, Response } from 'express';
import { PrismaClient, BookingStatus } from '@prisma/client';
import { getSocketIO, io } from '../../socket';
import { calculateDistance } from './user.booking.controller';

const prisma = new PrismaClient();

// Accept a booking
export const acceptBooking = async (req: Request, res: Response) => {
    const { bookingId, driverId } = req.body;
    
    try {
      // Fetch the booking
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  
      if (!booking || booking.status !== 'PENDING') {
        return res.status(400).json({ message: 'This booking is no longer available' });
      }
  
      // Update the booking to ACCEPTED
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'ACCEPTED',
          driverId
        }
      });
  
      // Notify the user about the booking acceptance
      await prisma.notification.create({
        data: {
          type: 'Booking Accepted',
          message: `Driver is en route to pick you up from ${booking.pickupLocation}`,
          userId: booking.userId,
          bookingId: booking.id
        }
      });
      
      // Emit notification to the user
      io?.to(booking.userId).emit('booking-accepted', {
        message: `Driver is en route to pick you up`,
        bookingId: booking.id,
        driverId: driverId
      });
  
      return res.status(200).json({ message: 'Booking accepted', booking: updatedBooking });
    } catch (error:any) {
      return res.status(500).json({ message: 'Error accepting booking', error: error.message });
    }
  };
  
 export const rejectBooking = async (req: Request, res: Response) => {
    const { bookingId, driverId } = req.body;
  
    try {
      // Update the booking status to REJECTED
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.REJECTED
        }
      });
  
      // Notify other drivers about the rejectio?n
      io?.emit('booking-rejected', { bookingId });
  
      return res.status(200).json({ message: 'Booking rejected' });
    } catch (error:any) {
      return res.status(500).json({ message: 'Error rejecting booking', error: error.message });
    }
  };
  

// Update the ride status (en route, delivered, etc.)
export const updateRideStatus = async (req: Request, res: Response) => {
    const { bookingId, driverId, status } = req.body;
  
    try {
      // Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status,
        }
      });
  
      // Send notification based on the new status
      let message = '';
      if (status === 'EN_ROUTE_TO_PICKUP') {
        message = 'Driver is en route to the pickup location.';
      } else if (status === 'GOODS_COLLECTED') {
        message = 'Goods have been collected by the driver.';
      } else if (status === 'EN_ROUTE_TO_DELIVERY') {
        message = 'Driver is en route to the delivery location.';
      } else if (status === 'DELIVERED') {
        message = 'Goods have been delivered.';
      }
  
      // Notify user via notification and Socket.IO
      await prisma.notification.create({
        data: {
          type: 'Ride Update',
          message,
          userId: updatedBooking.userId,
          bookingId: updatedBooking.id
        }
      });
  
      io?.to(updatedBooking.userId).emit('ride-status-update', {
        message,
        bookingId: updatedBooking.id,
        status
      });
  
      return res.status(200).json({ message: 'Status updated', booking: updatedBooking });
    } catch (error:any) {
      return res.status(500).json({ message: 'Error updating status', error: error.message });
    }
  };
  

// Cancel a ride
export const cancelRide = async (req: Request, res: Response) => {
    const { bookingId, driverId } = req.body;
  
    try {
      // Fetch the booking details
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Update the booking status to CANCELLED
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
        }
      });
  
      // Notify user about the cancellation
      await prisma.notification.create({
        data: {
          type: 'Ride Cancelled',
          message: 'Driver has cancelled the ride.',
          userId: booking.userId,
          bookingId
        }
      });
  
      io?.to(booking.userId).emit('ride-cancelled', {
        message: 'Driver has cancelled the ride.',
        bookingId
      });
  
      return res.status(200).json({ message: 'Ride cancelled' });
    } catch (error:any) {
      return res.status(500).json({ message: 'Error cancelling ride', error: error.message });
    }
  };
  

// Track driver location (real-time updates)
export const trackDriverLocation = (socket: any) => {

    
    socket.on('location-update', async ({ driverId, lat, lng, bookingId }: { driverId: string; lat: number; lng: number; bookingId: string }) => {
      try {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
          console.log('Booking not found');
          return;
        }
  
        // Calculate distance to destination using Google Maps
        const distanceToDestination = await calculateDistance(lat, lng, booking.dropoffLat, booking.dropoffLng);
  
        // Emit notifications based on the remaining distance
        if (distanceToDestination < 5) {
          io?.to(booking.userId).emit('ride-status-update', { message: 'Driver is 5km away from delivery', bookingId });
        }
        if (distanceToDestination < 1) {
          io?.to(booking.userId).emit('ride-status-update', { message: 'Driver is 1km away from delivery', bookingId });
        }
  
        // You can also update the booking with the driver's current location if needed
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            pickupLat: lat,
            pickupLng: lng,
          },
        });
  
        console.log(`Driver ${driverId} location updated: lat=${lat}, lng=${lng}`);
      } catch (error) {
        console.error('Error updating driver location:', error);
      }
    });
  };
