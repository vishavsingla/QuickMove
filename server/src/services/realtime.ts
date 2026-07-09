import { io } from "../socket";

export const emitToUser = (userId: string, event: string, data: unknown) => {
  io?.to(`user:${userId}`).emit(event, data);
};

export const emitToDriver = (driverId: string, event: string, data: unknown) => {
  io?.to(`driver:${driverId}`).emit(event, data);
};

export const emitToBooking = (bookingId: string, event: string, data: unknown) => {
  io?.to(`booking:${bookingId}`).emit(event, data);
};
