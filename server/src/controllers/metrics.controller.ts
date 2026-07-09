import { Request, Response } from "express";
import { getMetrics } from "../observability/metrics";

export const metricsHandler = async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.status(200).send(await getMetrics());
};
