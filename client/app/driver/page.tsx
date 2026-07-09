"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { ChatPanel } from "@/components/ChatPanel";
import { LiveMap, MapMarker } from "@/components/LiveMap";
import { useSocket } from "@/context/SocketProvider";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { STATUS_META, VEHICLE_META, currency } from "@/lib/ui";
import type { Booking, Driver } from "@/lib/types";

const NEXT_ACTION: Record<string, { status: string; label: string } | undefined> = {
  ACCEPTED: { status: "ARRIVED", label: "Mark arrived at pickup" },
  ARRIVED: { status: "IN_PROGRESS", label: "Start the move" },
  IN_PROGRESS: { status: "COMPLETED", label: "Complete move" },
};

function DriverInner() {
  const { user, driverId } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [offers, setOffers] = useState<Booking[]>([]);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const activeJob = jobs.find((j) =>
    ["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(j.status)
  );

  const refresh = useCallback(async () => {
    const [p, o, j] = await Promise.all([
      api.driverProfile(),
      api.driverOffers().catch(() => ({ offers: [] })),
      api.driverJobs(),
    ]);
    setDriver(p.driver);
    setOffers(o.offers);
    setJobs(j.jobs);
    if (p.driver.currentLat && p.driver.currentLng && !posRef.current)
      setPos({ lat: p.driver.currentLat, lng: p.driver.currentLng });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // New job offers arriving live
  useEffect(() => {
    if (!socket) return;
    const onNew = () => refresh();
    socket.on("job:new", onNew);
    return () => {
      socket.off("job:new", onNew);
    };
  }, [socket, refresh]);

  // Simulate GPS movement toward the current target of the active job and stream it.
  useEffect(() => {
    if (!activeJob || !socket) return;
    const target =
      activeJob.status === "IN_PROGRESS"
        ? { lat: activeJob.dropoffLat, lng: activeJob.dropoffLng }
        : { lat: activeJob.pickupLat, lng: activeJob.pickupLng };

    if (!posRef.current)
      setPos({ lat: target.lat + 0.02, lng: target.lng + 0.02 });

    const interval = setInterval(() => {
      const cur = posRef.current;
      if (!cur) return;
      const next = {
        lat: cur.lat + (target.lat - cur.lat) * 0.15,
        lng: cur.lng + (target.lng - cur.lng) * 0.15,
      };
      setPos(next);
      socket.emit("driver:location", {
        driverId,
        lat: next.lat,
        lng: next.lng,
        bookingId: activeJob.id,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJob, socket, driverId]);

  const toggleAvailability = async (value: boolean) => {
    const r = await api.setAvailability(value);
    setDriver(r.driver);
  };

  const accept = async (id: string) => {
    try {
      await api.acceptJob(id);
      toast({ title: "Job accepted" });
      refresh();
    } catch {
      toast({ title: "Already taken by another driver", variant: "destructive" });
      refresh();
    }
  };

  const reject = async (id: string) => {
    await api.rejectJob(id);
    setOffers((o) => o.filter((b) => b.id !== id));
  };

  const advance = async (id: string, status: string) => {
    const r = await api.updateJobStatus(id, status);
    setJobs((prev) => prev.map((j) => (j.id === id ? r.booking : j)));
    toast({ title: `Status: ${STATUS_META[r.booking.status].label}` });
  };

  if (!driver)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const pending = driver.status !== "APPROVED";
  const markers: MapMarker[] = activeJob
    ? [
        { lat: activeJob.pickupLat, lng: activeJob.pickupLng, kind: "pickup", label: "Pickup" },
        { lat: activeJob.dropoffLat, lng: activeJob.dropoffLng, kind: "dropoff", label: "Drop-off" },
        ...(pos ? [{ ...pos, kind: "driver" as const, label: "You" }] : []),
      ]
    : [];

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Driver dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {VEHICLE_META[driver.vehicleType].icon} {VEHICLE_META[driver.vehicleType].label} ·{" "}
            {driver.licensePlate} · ⭐ {driver.rating} · {driver.totalTrips ?? 0} trips
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border px-4 py-2">
          <span className="text-sm font-medium">
            {driver.isAvailable ? "Online" : "Offline"}
          </span>
          <Switch
            checked={!!driver.isAvailable}
            onCheckedChange={toggleAvailability}
            disabled={pending}
          />
        </div>
      </div>

      {pending && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 text-sm">
            Your account is <b>{driver.status}</b>. An admin must approve you before
            you can receive jobs.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active job */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active job</CardTitle>
          </CardHeader>
          <CardContent>
            {activeJob ? (
              <div className="space-y-4">
                <div className="h-56 overflow-hidden rounded-lg border">
                  <LiveMap markers={markers} showRoute className="h-full" />
                </div>
                <div className="text-sm">
                  <p><span className="text-muted-foreground">From:</span> {activeJob.pickupLocation}</p>
                  <p><span className="text-muted-foreground">To:</span> {activeJob.dropoffLocation}</p>
                  <p className="flex justify-between pt-1">
                    <Badge variant={STATUS_META[activeJob.status].variant}>
                      {STATUS_META[activeJob.status].label}
                    </Badge>
                    <span className="font-semibold">{currency(activeJob.estimatedCost)}</span>
                  </p>
                </div>
                {NEXT_ACTION[activeJob.status] && (
                  <Button
                    className="w-full"
                    onClick={() => advance(activeJob.id, NEXT_ACTION[activeJob.status]!.status)}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {NEXT_ACTION[activeJob.status]!.label}
                  </Button>
                )}
                {user && (
                  <ChatPanel bookingId={activeJob.id} userId={user.id} role="DRIVER" />
                )}
              </div>
            ) : (
              <div className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
                <MapPin className="mb-2 h-8 w-8 opacity-40" />
                No active job. Accept an offer to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Job offers {offers.length > 0 && <Badge variant="info">{offers.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Approval required to see offers.
              </p>
            ) : offers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No offers right now. Stay online — new jobs appear here instantly.
              </p>
            ) : (
              offers.map((o) => (
                <div key={o.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {o.pickupLocation.split(",")[0]} → {o.dropoffLocation.split(",")[0]}
                    </span>
                    <span className="font-semibold">{currency(o.estimatedCost)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.estimatedDistance} km</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => accept(o.id)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(o.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DriverPage() {
  return (
    <RequireRole role="DRIVER">
      <DriverInner />
    </RequireRole>
  );
}
