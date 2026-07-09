import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { loadPricingRules } from "./services/pricingRules";
import { initializeSocketIO, shutdownSocketIO } from "./socket";

const start = async () => {
  await loadPricingRules();
  const app = createApp();
  const httpServer = http.createServer(app);

  await initializeSocketIO(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`QuickMove API running on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
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
