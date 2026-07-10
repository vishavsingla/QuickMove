"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Navigation, Check, X, Upload, Shield, IndianRupee, TrendingUp } from "lucide-react";
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
import { useDriverLocation } from "@/hooks/useDriverLocation";
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
  const [initialPos, setInitialPos] = useState<{ lat: number; lng: number } | null>(null);
  const [kyc, setKyc] = useState<any>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [earnings, setEarnings] = useState<{
    summary: {
      balance: number;
      totalEarnings: number;
      weekEarnings: number;
      tripCount: number;
      pendingTrips: number;
      commissionRate: number;
    };
    transactions: Array<{
      id: string;
      amount: number;
      createdAt: string;
      booking: { pickupLocation: string; dropoffLocation: string } | null;
    }>;
  } | null>(null);

  const activeJob = jobs.find((j) =>
    ["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(j.status)
  );

  const trackingEnabled = !!(driver?.isAvailable || activeJob);
  const { pos, source: locationSource } = useDriverLocation({
    enabled: trackingEnabled,
    driverId,
    socket,
    activeJob: activeJob ?? null,
    initialPos,
  });

  const refresh = useCallback(async () => {
    const [p, o, j, k, e] = await Promise.all([
      api.driverProfile(),
      api.driverOffers().catch(() => ({ offers: [] })),
      api.driverJobs(),
      api.getDriverKyc().catch(() => null),
      api.driverEarnings().catch(() => null),
    ]);
    setDriver(p.driver);
    setOffers(o.offers);
    setJobs(j.jobs);
    if (k) setKyc(k.kyc);
    if (e) setEarnings(e);
    if (p.driver.currentLat && p.driver.currentLng && !initialPos)
      setInitialPos({ lat: p.driver.currentLat, lng: p.driver.currentLng });
  }, [initialPos]);

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

  const toggleAvailability = async (value: boolean) => {
    const r = await api.setAvailability(value);
    setDriver(r.driver);
  };

  const submitKyc = async () => {
    if (!licenseFile || !idFile) {
      toast({ title: "Upload both documents", variant: "destructive" });
      return;
    }
    setKycSubmitting(true);
    try {
      const r = await api.submitDriverKyc(licenseFile.name, idFile.name);
      setKyc(r.kyc);
      toast({ title: "KYC submitted for review" });
    } catch {
      toast({ title: "KYC submission failed", variant: "destructive" });
    } finally {
      setKycSubmitting(false);
    }
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
          {trackingEnabled && locationSource && (
            <Badge variant={locationSource === "gps" ? "success" : "secondary"}>
              {locationSource === "gps" ? "Live GPS" : "Simulated"}
            </Badge>
          )}
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> KYC verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Badge
            variant={
              kyc?.kycStatus === "VERIFIED"
                ? "success"
                : kyc?.kycStatus === "REJECTED"
                  ? "destructive"
                  : kyc?.kycStatus === "SUBMITTED"
                    ? "warning"
                    : "secondary"
            }
          >
            {kyc?.kycStatus ?? "NOT_SUBMITTED"}
          </Badge>
          {kyc?.kycStatus === "VERIFIED" && (
            <p className="text-emerald-600">Your documents are verified.</p>
          )}
          {kyc?.kycStatus === "SUBMITTED" && (
            <p className="text-muted-foreground">Under admin review — usually within 24 hours.</p>
          )}
          {kyc?.kycStatus === "REJECTED" && (
            <p className="text-destructive">{kyc.kycNote || "Please re-upload your documents."}</p>
          )}
          {(!kyc || kyc.kycStatus === "NOT_SUBMITTED" || kyc.kycStatus === "REJECTED") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed p-3">
                <span className="font-medium">Driving license</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="text-xs"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed p-3">
                <span className="font-medium">Government ID</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="text-xs"
                  onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button
                className="sm:col-span-2"
                onClick={submitKyc}
                disabled={kycSubmitting || !licenseFile || !idFile}
              >
                {kycSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Submit for verification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {earnings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5" /> Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="text-xl font-bold">{currency(earnings.summary.balance)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">This week</p>
                <p className="text-xl font-bold">{currency(earnings.summary.weekEarnings)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">All-time trips</p>
                <p className="text-xl font-bold">{earnings.summary.tripCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Pending payout</p>
                <p className="text-xl font-bold">
                  {earnings.summary.pendingTrips > 0 ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <TrendingUp className="h-4 w-4" />
                      {earnings.summary.pendingTrips} trip{earnings.summary.pendingTrips > 1 ? "s" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You keep {(1 - earnings.summary.commissionRate) * 100}% of each fare; platform fee is{" "}
              {earnings.summary.commissionRate * 100}%.
            </p>
            {earnings.transactions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent trip payouts</p>
                {earnings.transactions.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {t.booking
                          ? `${t.booking.pickupLocation.split(",")[0]} → ${t.booking.dropoffLocation.split(",")[0]}`
                          : "Trip earnings"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600">+{currency(t.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete paid trips to see earnings here.
              </p>
            )}
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

      {activeJob && user && (
        <Card className="mt-6 border-primary/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chat with customer</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Message the customer about pickup, delays, or access details.
            </p>
          </CardHeader>
          <CardContent>
            <ChatPanel
              bookingId={activeJob.id}
              userId={user.id}
              role="DRIVER"
              title="Chat with customer"
              bare
            />
          </CardContent>
        </Card>
      )}
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
