import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { loadPricingRules } from "./services/pricingRules";
import { initializeSocketIO, shutdownSocketIO } from "./socket";
import { initTracing, shutdownTracing } from "./observability/tracing";

const start = async () => {
  initTracing();
  await loadPricingRules();
  const app = createApp();
  const httpServer = http.createServer(app);

  await initializeSocketIO(httpServer);

  httpServer.listen(env.port, "0.0.0.0", () => {
    console.log(`QuickMove API listening on port ${env.port}`);
  });

  const shutdown = async () => {
    await shutdownTracing();
    await shutdownSocketIO();
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
