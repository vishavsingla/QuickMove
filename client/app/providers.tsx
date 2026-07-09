"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "@/context/AuthProvider";
import { SocketProvider } from "@/context/SocketProvider";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SocketProvider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
