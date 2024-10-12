// index.ts
import express, { Express } from "express";
import dotenv from "dotenv";
import UserAuthRouter from "./routers/authentication/user.auth.router"
import AdminAuthRouter from "./routers/authentication/admin.auth.router"
import DriverAuthRouter from "./routers/authentication/driver.auth.router"
import cors from "cors";
import http from "http";
import { initializeSocketIO } from "./socket";

dotenv.config();
const app: Express = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 5001;

initializeSocketIO(httpServer);

app.use(express.json());
const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use("/auth/user", UserAuthRouter);
app.use("/auth/admin", AdminAuthRouter);
app.use("/auth/driver", DriverAuthRouter);


app.get("/", (req, res) => {
  res.send("Express TS Server");
});

httpServer.listen(port, () => {
  console.log(`Server is running on ${port}`);
});