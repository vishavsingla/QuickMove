"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Clock, Route, Plus, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { AddressSearch } from "@/components/AddressSearch";
import { LiveMap, MapMarker } from "@/components/LiveMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VEHICLE_META, currency } from "@/lib/ui";
import type { Estimate, PlaceResult, SavedAddress, VehicleType } from "@/lib/types";
import { cn } from "@/lib/utils";

type MapTarget = "pickup" | "dropoff" | { stop: number };

function BookInner() {
  const router = useRouter();
  const { toast } = useToast();
  const [pickup, setPickup] = useState<PlaceResult | null>(null);
  const [stops, setStops] = useState<PlaceResult[]>([]);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("CAR");
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponDesc, setCouponDesc] = useState("");
  const [mapTarget, setMapTarget] = useState<MapTarget>("pickup");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const routePoints = useMemo(
    () => [pickup, ...stops, dropoff].filter(Boolean) as PlaceResult[],
    [pickup, stops, dropoff]
  );

  const hasValidCoords = (p: PlaceResult | null) =>
    !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0);

  useEffect(() => {
    api.listAddresses().then((r) => setSavedAddresses(r.addresses)).catch(() => undefined);
  }, []);

  const applySavedAddress = (addr: SavedAddress, target: "pickup" | "dropoff") => {
    const place: PlaceResult = {
      displayName: addr.address,
      lat: addr.lat,
      lng: addr.lng,
    };
    if (target === "pickup") setPickup(place);
    else setDropoff(place);
  };

  useEffect(() => {
    if (!hasValidCoords(pickup) || !hasValidCoords(dropoff)) {
      setEstimate(null);
      return;
    }
    setEstimating(true);
    api
      .estimate({
        pickupLat: pickup!.lat,
        pickupLng: pickup!.lng,
        dropoffLat: dropoff!.lat,
        dropoffLng: dropoff!.lng,
        stops: stops
          .filter((s) => hasValidCoords(s))
          .map((s) => ({ lat: s.lat, lng: s.lng })),
      })
      .then(setEstimate)
      .catch(() =>
        toast({ title: "Could not estimate fare", variant: "destructive" })
      )
      .finally(() => setEstimating(false));
  }, [pickup, dropoff, stops, toast]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (hasValidCoords(pickup))
      m.push({ lat: pickup!.lat, lng: pickup!.lng, kind: "pickup", label: "Pickup" });
    stops.forEach((s, i) => {
      if (hasValidCoords(s))
        m.push({
          lat: s.lat,
          lng: s.lng,
          kind: "waypoint",
          label: `Stop ${i + 1}`,
          stopIndex: i,
        });
    });
    if (hasValidCoords(dropoff))
      m.push({
        lat: dropoff!.lat,
        lng: dropoff!.lng,
        kind: "dropoff",
        label: "Drop-off",
      });
    return m;
  }, [pickup, stops, dropoff]);

  const updateStop = useCallback((index: number, place: PlaceResult) => {
    setStops((prev) => prev.map((s, i) => (i === index ? place : s)));
  }, []);

  const applyPlaceFromMap = useCallback(
    async (lat: number, lng: number, target: MapTarget) => {
      setReverseLoading(true);
      try {
        const { place } = await api.reversePlace(lat, lng);
        if (target === "pickup") setPickup(place);
        else if (target === "dropoff") setDropoff(place);
        else updateStop(target.stop, place);
      } catch {
        const fallback = {
          displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        };
        if (target === "pickup") setPickup(fallback);
        else if (target === "dropoff") setDropoff(fallback);
        else updateStop(target.stop, fallback);
        toast({
          title: "Could not resolve address",
          description: "Using coordinates for this pin.",
          variant: "destructive",
        });
      } finally {
        setReverseLoading(false);
      }
    },
    [toast, updateStop]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      void applyPlaceFromMap(lat, lng, mapTarget);
    },
    [applyPlaceFromMap, mapTarget]
  );

  const handleMarkerDrag = useCallback(
    (marker: MapMarker, lat: number, lng: number) => {
      let target: MapTarget;
      if (marker.kind === "pickup") target = "pickup";
      else if (marker.kind === "dropoff") target = "dropoff";
      else if (marker.stopIndex != null) target = { stop: marker.stopIndex };
      else return;
      void applyPlaceFromMap(lat, lng, target);
    },
    [applyPlaceFromMap]
  );

  const selectedQuote = estimate?.quotes.find((q) => q.vehicleType === vehicle);
  const payable =
    selectedQuote != null
      ? Math.max(0, selectedQuote.fare.total - couponDiscount)
      : 0;

  const applyCoupon = async () => {
    if (!selectedQuote || !couponInput.trim()) return;
    try {
      const r = await api.validateCoupon(couponInput.trim(), selectedQuote.fare.total);
      if (r.valid && r.discount != null) {
        setCouponDiscount(r.discount);
        setCouponDesc(r.description || r.code || "");
        toast({ title: "Coupon applied", description: `You save ${currency(r.discount)}` });
      }
    } catch (err) {
      setCouponDiscount(0);
      setCouponDesc("");
      toast({
        title: "Invalid coupon",
        description: err instanceof ApiError ? err.message : "Try another code",
        variant: "destructive",
      });
    }
  };

  const addStop = () => {
    if (stops.length >= 5) {
      toast({ title: "Maximum 5 stops", variant: "destructive" });
      return;
    }
    setStops((prev) => [...prev, { displayName: "", lat: 0, lng: 0 }]);
    setMapTarget({ stop: stops.length });
  };

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const book = async () => {
    if (!hasValidCoords(pickup) || !hasValidCoords(dropoff)) return;
    const validStops = stops.filter((s) => s.displayName && hasValidCoords(s));
    setBooking(true);
    try {
      const res = await api.createBooking({
        pickupLocation: pickup!.displayName,
        pickupLat: pickup!.lat,
        pickupLng: pickup!.lng,
        dropoffLocation: dropoff!.displayName,
        dropoffLat: dropoff!.lat,
        dropoffLng: dropoff!.lng,
        vehicleType: vehicle,
        ...(couponDiscount > 0 && couponInput.trim()
          ? { couponCode: couponInput.trim().toUpperCase() }
          : {}),
        ...(validStops.length
          ? {
              stops: validStops.map((s) => ({
                location: s.displayName,
                lat: s.lat,
                lng: s.lng,
              })),
            }
          : {}),
        ...(scheduleForLater && scheduledAt
          ? { scheduledTime: new Date(scheduledAt).toISOString() }
          : {}),
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

  const mapTargetLabel =
    mapTarget === "pickup"
      ? "pickup"
      : mapTarget === "dropoff"
        ? "drop-off"
        : `stop ${mapTarget.stop + 1}`;

  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan your move</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Saved addresses</p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((a) => (
                    <div key={a.id} className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applySavedAddress(a, "pickup")}
                      >
                        {a.label} → pickup
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applySavedAddress(a, "dropoff")}
                      >
                        → drop
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AddressSearch
              label="Pickup location"
              placeholder="Search pickup address (e.g. Chandigarh)"
              value={pickup}
              onSelect={setPickup}
              onFocusField={() => setMapTarget("pickup")}
            />

            {stops.map((stop, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <AddressSearch
                    label={`Stop ${i + 1}`}
                    placeholder="Search stop address"
                    value={stop.displayName ? stop : null}
                    onSelect={(p) => updateStop(i, p)}
                    onFocusField={() => setMapTarget({ stop: i })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeStop(i)}
                  aria-label={`Remove stop ${i + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addStop}>
              <Plus className="mr-1 h-4 w-4" /> Add stop
            </Button>

            <AddressSearch
              label="Drop-off location"
              placeholder="Search drop-off address (e.g. Manali)"
              value={dropoff}
              onSelect={setDropoff}
              onFocusField={() => setMapTarget("dropoff")}
            />

            <div className="rounded-lg border p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={scheduleForLater}
                  onChange={(e) => setScheduleForLater(e.target.checked)}
                  className="rounded"
                />
                <Clock className="h-4 w-4" /> Schedule for later
              </label>
              {scheduleForLater && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>

            {estimating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating route & fares…
              </div>
            )}

            {estimate && (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="info" className="gap-1">
                  <Route className="h-3 w-3" /> {estimate.distanceKm} km
                  {routePoints.length > 2 && ` · ${routePoints.length} stops`}
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
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Coupon ({couponDesc || couponInput})</span>
                      <span>-{currency(couponDiscount)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>You pay</span>
                      <span>{currency(payable)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponDiscount(0);
                  }}
                />
                <Button type="button" variant="outline" onClick={applyCoupon} disabled={!couponInput.trim()}>
                  Apply
                </Button>
              </div>

              <Button className="w-full" size="lg" onClick={book} disabled={booking}>
                {booking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Book {VEHICLE_META[vehicle].label} · {selectedQuote ? currency(payable) : ""}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="relative min-h-[480px] overflow-hidden rounded-xl border">
        <div className="absolute left-3 top-3 z-[1000] rounded-md border bg-background/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
          {reverseLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Resolving address…
            </span>
          ) : (
            <>
              Click map or drag pins to set <strong>{mapTargetLabel}</strong>
            </>
          )}
        </div>
        <LiveMap
          markers={markers}
          showRoute={!!estimate}
          routePath={estimate?.routeGeometry}
          className="h-full min-h-[480px]"
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
          mapClickEnabled
        />
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
