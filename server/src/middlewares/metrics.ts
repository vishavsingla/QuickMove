import { Request, Response, NextFunction } from "express";
import { httpRequestsTotal } from "../observability/metrics";

/** Normalize path for metric labels (replace ids with :id). */
const normalizeRoute = (path: string) =>
  path
    .replace(/\/[a-z0-9]{20,}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: normalizeRoute(req.route?.path ?? req.path),
      status: String(res.statusCode),
    });
  });
  next();
};
