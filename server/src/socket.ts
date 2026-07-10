import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import {
  connectRedisPubSub,
  disconnectRedisClients,
  redactRedisUrl,
  type RedisClient,
} from "./lib/redis";
import { saveMessage } from "./controllers/chat.controller";

export let io: Server | null = null;
let pubClient: RedisClient | null = null;
let subClient: RedisClient | null = null;

const attachHandlers = (server: Server) => {
  server.on("connection", (socket) => {
    socket.on(
      "register",
      ({
        userId,
        driverId,
        isAdmin,
      }: {
        userId?: string;
        driverId?: string;
        isAdmin?: boolean;
      }) => {
        if (userId) socket.join(`user:${userId}`);
        if (driverId) socket.join(`driver:${driverId}`);
        if (isAdmin) socket.join("admin:live");
      }
    );

    socket.on("booking:join", ({ bookingId }: { bookingId: string }) => {
      if (bookingId) socket.join(`booking:${bookingId}`);
    });

    socket.on("booking:leave", ({ bookingId }: { bookingId: string }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

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

          const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: {
              id: true,
              name: true,
              vehicleType: true,
              licensePlate: true,
              isAvailable: true,
            },
          });
          if (driver) {
            server.to("admin:live").emit("admin:driverLocation", {
              driverId,
              lat,
              lng,
              ...driver,
            });
          }

          if (bookingId) {
            const booking = await prisma.booking.update({
              where: { id: bookingId },
              data: { driverLat: lat, driverLng: lng },
            });
            server
              .to(`booking:${bookingId}`)
              .to(`user:${booking.userId}`)
              .emit("booking:driverLocation", { bookingId, lat, lng });
          }
        } catch {
          /* stale booking/driver */
        }
      }
    );

    socket.on(
      "chat:send",
      async ({
        bookingId,
        senderUserId,
        senderRole,
        body,
      }: {
        bookingId: string;
        senderUserId: string;
        senderRole: string;
        body: string;
      }) => {
        if (!bookingId || !body?.trim() || !senderUserId) return;
        try {
          const msg = await saveMessage(
            bookingId,
            senderUserId,
            senderRole,
            body.trim().slice(0, 2000)
          );
          server.to(`booking:${bookingId}`).emit("chat:message", msg);
        } catch {
          /* invalid booking */
        }
      }
    );

    socket.on(
      "chat:typing",
      ({
        bookingId,
        userId,
        isTyping,
      }: {
        bookingId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        if (!bookingId) return;
        socket.to(`booking:${bookingId}`).emit("chat:typing", {
          bookingId,
          userId,
          isTyping,
        });
      }
    );
  });
};

/**
 * When REDIS_URL is set, wires the Socket.io Redis adapter so events fan out
 * across multiple API pods. Without Redis the server runs in single-node mode.
 */
export const initializeSocketIO = async (server: http.Server): Promise<Server> => {
  const socketServer = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  if (env.redisUrl) {
    const pair = await connectRedisPubSub(env.redisUrl);
    if (pair) {
      pubClient = pair.pub;
      subClient = pair.sub;
      socketServer.adapter(createAdapter(pubClient, subClient));
      console.log(
        `Socket.io using Redis adapter at ${redactRedisUrl(env.redisUrl)}`
      );
    } else {
      console.log(
        "Socket.io running in single-node mode (Redis adapter unavailable)"
      );
    }
  } else {
    console.log("Socket.io running in single-node mode (no REDIS_URL)");
  }

  attachHandlers(socketServer);
  io = socketServer;
  return socketServer;
};

export const shutdownSocketIO = async () => {
  if (io) {
    await new Promise<void>((resolve) => io!.close(() => resolve()));
    io = null;
  }
  await disconnectRedisClients(pubClient, subClient);
  pubClient = null;
  subClient = null;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

export const isRedisAdapterEnabled = () => Boolean(pubClient);
