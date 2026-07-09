import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import authRouter from "./routers/auth.router";
import geoRouter from "./routers/geo.router";
import bookingRouter from "./routers/booking.router";
import driverRouter from "./routers/driver.router";
import adminRouter from "./routers/admin.router";
import notificationRouter from "./routers/notification.router";
import userRouter from "./routers/user.router";

export const createApp = (): Express => {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "quickmove" }));

  app.use("/api/auth", authRouter);
  app.use("/api/geo", geoRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/driver", driverRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/user", userRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not found" }));

  // Centralized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
};
