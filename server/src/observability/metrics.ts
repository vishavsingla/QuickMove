import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry, prefix: "quickmove_" });

export const httpRequestsTotal = new client.Counter({
  name: "quickmove_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [metricsRegistry],
});

export const bookingsCreatedTotal = new client.Counter({
  name: "quickmove_bookings_created_total",
  help: "Bookings created",
  registers: [metricsRegistry],
});

export const paymentsSucceededTotal = new client.Counter({
  name: "quickmove_payments_succeeded_total",
  help: "Successful payments",
  registers: [metricsRegistry],
});

export const getMetrics = async () => metricsRegistry.metrics();
