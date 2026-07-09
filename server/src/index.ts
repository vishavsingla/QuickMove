import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initializeSocketIO } from "./socket";

const app = createApp();
const httpServer = http.createServer(app);

initializeSocketIO(httpServer);

httpServer.listen(env.port, () => {
  console.log(`QuickMove API running on http://localhost:${env.port}`);
});
