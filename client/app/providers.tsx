"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthProvider";
import { SocketProvider } from "@/context/SocketProvider";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
        <PushNotificationSetup />
      </SocketProvider>
    </AuthProvider>
  );
}
