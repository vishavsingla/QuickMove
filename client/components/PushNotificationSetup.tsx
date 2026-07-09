"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";

/**
 * Registers the service worker and saves a stub push subscription.
 * Full VAPID web push can replace the stub endpoint in production.
 */
export function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const setup = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        const status = await api.pushStatus().catch(() => ({ enabled: false }));
        if (status.enabled) return;

        const endpoint = `stub://push/${user.id}/${navigator.userAgent.slice(0, 24)}`;
        await api.subscribePush(endpoint);
      } catch {
        /* permission denied or unsupported — in-app notifications still work */
      }
    };

    setup();
  }, [user]);

  return null;
}
