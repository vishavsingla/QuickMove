"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Clock, Route } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { AddressSearch } from "@/components/AddressSearch";
import { LiveMap, MapMarker } from "@/components/LiveMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VEHICLE_META, currency } from "@/lib/ui";
import type { Estimate, PlaceResult, VehicleType } from "@/lib/types";
import { cn } from "@/lib/utils";

function BookInner() {
  const router = useRouter();
  const { toast } = useToast();
  const [pickup, setPickup] = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("CAR");
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setEstimate(null);
      return;
    }
    setEstimating(true);
    api
      .estimate({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
      })
      .then(setEstimate)
      .catch(() =>
        toast({ title: "Could not estimate fare", variant: "destructive" })
      )
      .finally(() => setEstimating(false));
  }, [pickup, dropoff, toast]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (pickup) m.push({ lat: pickup.lat, lng: pickup.lng, kind: "pickup", label: "Pickup" });
    if (dropoff) m.push({ lat: dropoff.lat, lng: dropoff.lng, kind: "dropoff", label: "Drop-off" });
    return m;
  }, [pickup, dropoff]);

  const selectedQuote = estimate?.quotes.find((q) => q.vehicleType === vehicle);

  const book = async () => {
    if (!pickup || !dropoff) return;
    setBooking(true);
    try {
      const res = await api.createBooking({
        pickupLocation: pickup.displayName,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLocation: dropoff.displayName,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        vehicleType: vehicle,
      });
      toast({ title: "Booking created", description: "Finding you a driver…" });
      router.push(`/bookings/${res.booking.id}`);
    } catch (err) {
      toast({
        title: "Booking failed",
        description: err instanceof ApiError ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan your move</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressSearch
              label="Pickup location"
              placeholder="Search pickup address"
              value={pickup}
              onSelect={setPickup}
            />
            <AddressSearch
              label="Drop-off location"
              placeholder="Search drop-off address"
              value={dropoff}
              onSelect={setDropoff}
            />

            {estimating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating route & fares…
              </div>
            )}

            {estimate && (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="info" className="gap-1">
                  <Route className="h-3 w-3" /> {estimate.distanceKm} km
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> {Math.round(estimate.durationMin)} min
                </Badge>
                {estimate.surgeMultiplier > 1 && (
                  <Badge variant="warning">Surge ×{estimate.surgeMultiplier}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {estimate && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {estimate.quotes.map((q) => (
                <button
                  key={q.vehicleType}
                  onClick={() => setVehicle(q.vehicleType)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    vehicle === q.vehicleType && "border-primary ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{VEHICLE_META[q.vehicleType].icon}</span>
                    <div>
                      <div className="font-medium">{VEHICLE_META[q.vehicleType].label}</div>
                      <div className="text-xs text-muted-foreground">
                        {VEHICLE_META[q.vehicleType].blurb}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">{currency(q.fare.total)}</div>
                </button>
              ))}

              {selectedQuote && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base</span>
                    <span>{currency(selectedQuote.fare.base)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span>{currency(selectedQuote.fare.distanceCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{currency(selectedQuote.fare.timeCost)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                    <span>Total</span>
                    <span>{currency(selectedQuote.fare.total)}</span>
                  </div>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={book} disabled={booking}>
                {booking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Book {VEHICLE_META[vehicle].label} · {selectedQuote ? currency(selectedQuote.fare.total) : ""}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="min-h-[400px] overflow-hidden rounded-xl border">
        {markers.length > 0 ? (
          <LiveMap markers={markers} showRoute className="h-full" />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
            <div>
              <Route className="mx-auto mb-3 h-10 w-10 opacity-40" />
              Search a pickup and drop-off to see your route.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <RequireRole role="USER">
      <BookInner />
    </RequireRole>
  );
}
