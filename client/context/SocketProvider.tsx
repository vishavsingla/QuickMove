"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface SocketState {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketState>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, driverId } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // (Re)register rooms whenever identity changes.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const doRegister = () =>
      socket.emit("register", {
        userId: user?.id,
        driverId: driverId ?? undefined,
      });
    if (socket.connected) doRegister();
    socket.on("connect", doRegister);
    return () => {
      socket.off("connect", doRegister);
    };
  }, [user?.id, driverId]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
