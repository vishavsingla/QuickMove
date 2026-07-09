"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";

export type GeoPosition = { lat: number; lng: number };
export type LocationSource = "gps" | "simulated" | null;

type ActiveJob = {
  id: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
};

type Options = {
  enabled: boolean;
  driverId: string | null;
  socket: Socket | null;
  activeJob: ActiveJob | null;
  initialPos: GeoPosition | null;
};

export function useDriverLocation({
  enabled,
  driverId,
  socket,
  activeJob,
  initialPos,
}: Options) {
  const [pos, setPos] = useState<GeoPosition | null>(initialPos);
  const [source, setSource] = useState<LocationSource>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const emitLocation = (next: GeoPosition, bookingId?: string) => {
    setPos(next);
    if (!driverId || !socket) return;
    socket.emit("driver:location", {
      driverId,
      lat: next.lat,
      lng: next.lng,
      bookingId,
    });
  };

  useEffect(() => {
    if (!enabled || !driverId) return;

    let watchId: number | null = null;
    let simInterval: ReturnType<typeof setInterval> | null = null;
    let apiInterval: ReturnType<typeof setInterval> | null = null;
    let useSimulation = false;

    const startSimulation = () => {
      if (!activeJob || useSimulation) return;
      useSimulation = true;
      setSource("simulated");

      const target =
        activeJob.status === "IN_PROGRESS"
          ? { lat: activeJob.dropoffLat, lng: activeJob.dropoffLng }
          : { lat: activeJob.pickupLat, lng: activeJob.pickupLng };

      if (!posRef.current) {
        emitLocation(
          { lat: target.lat + 0.02, lng: target.lng + 0.02 },
          activeJob.id
        );
      }

      simInterval = setInterval(() => {
        const cur = posRef.current;
        if (!cur) return;
        const next = {
          lat: cur.lat + (target.lat - cur.lat) * 0.15,
          lng: cur.lng + (target.lng - cur.lng) * 0.15,
        };
        emitLocation(next, activeJob.id);
      }, 2000);
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          useSimulation = false;
          if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
          }
          setSource("gps");
          emitLocation(
            { lat: p.coords.latitude, lng: p.coords.longitude },
            activeJob?.id
          );
        },
        () => {
          startSimulation();
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } else {
      startSimulation();
    }

    apiInterval = setInterval(() => {
      const cur = posRef.current;
      if (cur) api.driverLocation(cur.lat, cur.lng).catch(() => undefined);
    }, 30000);

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (simInterval) clearInterval(simInterval);
      if (apiInterval) clearInterval(apiInterval);
    };
  }, [enabled, driverId, socket, activeJob?.id, activeJob?.status]);

  return { pos, source };
}
