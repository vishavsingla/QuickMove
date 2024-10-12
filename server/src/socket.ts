// socket.ts
import { Server } from "socket.io";
import http from "http";

let io: Server | null = null;

export const initializeSocketIO = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User Connected", socket.id);

    socket.on("event:message", (data) => {
      console.log(data);
      if(io)
      io.emit("message", JSON.stringify(data));
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);
    });

  });
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};