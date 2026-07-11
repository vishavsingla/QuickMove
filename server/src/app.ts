import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { createCorsOriginCallback, corsOptions } from "./config/cors";
import { env } from "./config/env";
import authRouter from "./routers/auth.router";
import geoRouter from "./routers/geo.router";
import bookingRouter from "./routers/booking.router";
import driverRouter from "./routers/driver.router";
import adminRouter from "./routers/admin.router";
import notificationRouter from "./routers/notification.router";
import paymentRouter from "./routers/payment.router";
import userRouter from "./routers/user.router";
import couponRouter from "./routers/coupon.router";
import { apiRateLimit } from "./middlewares/rateLimit";
import { metricsMiddleware } from "./middlewares/metrics";
import { metricsHandler } from "./controllers/metrics.controller";
import { razorpayWebhook } from "./controllers/payment.controller";

export const createApp = (): Express => {
  const app = express();

  // Render/Fly/nginx set X-Forwarded-For; required for express-rate-limit in production.
  const trustProxy =
    process.env.TRUST_PROXY ??
    (process.env.NODE_ENV === "production" ? "1" : "0");
  if (trustProxy !== "0" && trustProxy !== "false") {
    app.set("trust proxy", Number(trustProxy) || 1);
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    razorpayWebhook
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: createCorsOriginCallback(env.corsOrigins),
      ...corsOptions,
    })
  );
  app.use(apiRateLimit);
  app.use(metricsMiddleware);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "quickmove" }));
  app.get("/metrics", metricsHandler);

  app.use("/api/auth", authRouter);
  app.use("/api/geo", geoRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/driver", driverRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/user", userRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/coupons", couponRouter);

  app.use((_req, res) => res.status(404).json({ message: "Not found" }));

  // Centralized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
};
