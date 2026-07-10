"use client";

import {
  createContext,
  useContext,
  useEffect,
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
  const { user, driverId, role, loading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(API_URL, { transports: ["websocket", "polling"] });
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  // (Re)register rooms whenever identity changes.
  useEffect(() => {
    if (!socket || loading) return;
    const doRegister = () =>
      socket.emit("register", {
        userId: user?.id,
        driverId: driverId ?? undefined,
        isAdmin: role === "ADMIN",
      });
    if (socket.connected) doRegister();
    socket.on("connect", doRegister);
    return () => {
      socket.off("connect", doRegister);
    };
  }, [socket, user?.id, driverId, role, loading]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
