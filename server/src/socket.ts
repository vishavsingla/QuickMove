import { Server } from "socket.io";
import http from "http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

export let io: Server | null = null;

export const initializeSocketIO = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Client identifies itself so we can target user/driver rooms.
    socket.on(
      "register",
      ({ userId, driverId }: { userId?: string; driverId?: string }) => {
        if (userId) socket.join(`user:${userId}`);
        if (driverId) socket.join(`driver:${driverId}`);
      }
    );

    socket.on("booking:join", ({ bookingId }: { bookingId: string }) => {
      if (bookingId) socket.join(`booking:${bookingId}`);
    });

    socket.on("booking:leave", ({ bookingId }: { bookingId: string }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    // Live driver location during an active job.
    socket.on(
      "driver:location",
      async ({
        driverId,
        lat,
        lng,
        bookingId,
      }: {
        driverId: string;
        lat: number;
        lng: number;
        bookingId?: string;
      }) => {
        try {
          if (!driverId || lat == null || lng == null) return;
          await prisma.driver.update({
            where: { id: driverId },
            data: { currentLat: lat, currentLng: lng },
          });

          if (bookingId) {
            const booking = await prisma.booking.update({
              where: { id: bookingId },
              data: { driverLat: lat, driverLng: lng },
            });
            io?.to(`booking:${bookingId}`)
              .to(`user:${booking.userId}`)
              .emit("booking:driverLocation", { bookingId, lat, lng });
          }
        } catch (e) {
          // ignore transient errors from stale bookings/drivers
        }
      }
    );
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};
