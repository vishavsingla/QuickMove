"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Phone, Star, XCircle, CheckCircle2, Download } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { LiveMap, MapMarker } from "@/components/LiveMap";
import { ChatPanel } from "@/components/ChatPanel";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { EtaCountdown } from "@/components/EtaCountdown";
import { useSocket } from "@/context/SocketProvider";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { STATUS_META, VEHICLE_META, currency } from "@/lib/ui";
import type { Booking, BookingStatus } from "@/lib/types";

const TIMELINE: BookingStatus[] = [
  "PENDING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

function TrackInner({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    api
      .getBooking(id)
      .then((r) => {
        setBooking(r.booking);
        if (r.booking.driverLat && r.booking.driverLng)
          setDriverPos({ lat: r.booking.driverLat, lng: r.booking.driverLng });
      })
      .catch(() => setNotFound(true));
  }, [id, user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      load();
    } else {
      setNeedsPhone(true);
    }
  }, [authLoading, user, load]);

  const verifyPhone = async () => {
    if (phoneInput.trim().length < 8) return;
    setVerifying(true);
    try {
      const r = await api.trackGuestBooking(id, phoneInput.trim());
      setBooking(r.booking);
      setNeedsPhone(false);
      if (r.booking.driverLat && r.booking.driverLng)
        setDriverPos({ lat: r.booking.driverLat, lng: r.booking.driverLng });
    } catch (err) {
      toast({
        title: "Could not verify",
        description: err instanceof ApiError ? err.message : "Check your phone number",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.emit("booking:join", { bookingId: id });
    const onUpdate = (b: Booking) => {
      if (b.id === id) setBooking(b);
    };
    const onLoc = (p: { bookingId: string; lat: number; lng: number }) => {
      if (p.bookingId === id) setDriverPos({ lat: p.lat, lng: p.lng });
    };
    socket.on("booking:update", onUpdate);
    socket.on("booking:driverLocation", onLoc);
    return () => {
      socket.emit("booking:leave", { bookingId: id });
      socket.off("booking:update", onUpdate);
      socket.off("booking:driverLocation", onLoc);
    };
  }, [socket, id]);

  const markers = useMemo<MapMarker[]>(() => {
    if (!booking) return [];
    const m: MapMarker[] = [];
    if (booking.stops?.length) {
      for (const s of booking.stops) {
        const kind =
          s.stopType === "PICKUP"
            ? "pickup"
            : s.stopType === "DROP"
              ? "dropoff"
              : "waypoint";
        m.push({ lat: s.lat, lng: s.lng, kind, label: s.location });
      }
    } else {
      m.push({ lat: booking.pickupLat, lng: booking.pickupLng, kind: "pickup", label: "Pickup" });
      m.push({ lat: booking.dropoffLat, lng: booking.dropoffLng, kind: "dropoff", label: "Drop-off" });
    }
    if (driverPos) m.push({ ...driverPos, kind: "driver", label: "Driver" });
    return m;
  }, [booking, driverPos]);

  const payable = booking
    ? Math.max(0, booking.estimatedCost - (booking.discountAmount || 0))
    : 0;

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      const r = await api.cancelBooking(id, cancelReason.trim() || undefined);
      setBooking(r.booking);
      setCancelOpen(false);
      toast({
        title: "Booking cancelled",
        description: r.refundAmount
          ? `₹${r.refundAmount} refunded to your wallet`
          : undefined,
      });
    } catch (err) {
      toast({
        title: "Could not cancel",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const rate = async (value: number) => {
    setRatingValue(value);
    try {
      await api.rateBooking(id, value);
      toast({ title: "Thanks for rating!" });
      load();
    } catch {
      toast({ title: "Could not submit rating", variant: "destructive" });
    }
  };

  const downloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const { blob, filename } = await api.downloadInvoicePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Invoice downloaded" });
    } catch {
      toast({ title: "Could not download invoice", variant: "destructive" });
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (authLoading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (needsPhone && !booking)
    return (
      <div className="container flex min-h-[60vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Track your move</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the phone number you used when booking to view live tracking.
            </p>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={phoneInput.trim().length < 8 || verifying}
              onClick={verifyPhone}
            >
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              View booking
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Have an account?{" "}
              <a href={`/login?next=/bookings/${id}`} className="text-primary underline-offset-4 hover:underline">
                Log in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );

  if (notFound)
    return <div className="container py-20 text-center text-muted-foreground">Booking not found.</div>;
  if (!booking)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const activeIdx = TIMELINE.indexOf(booking.status);
  const canCancel = !["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.status);

  return (
    <div className="container grid gap-6 px-4 py-6 sm:py-8 lg:grid-cols-[1fr_minmax(0,380px)]">
      <div className="order-2 min-h-[400px] overflow-hidden rounded-xl border lg:order-1">
        <LiveMap markers={markers} showRoute className="h-full" />
      </div>

      <div className="order-1 space-y-4 lg:order-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">
              {VEHICLE_META[booking.vehicleType].icon} {VEHICLE_META[booking.vehicleType].label} move
            </CardTitle>
            <Badge variant={STATUS_META[booking.status].variant}>
              {STATUS_META[booking.status].label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <EtaCountdown
              status={booking.status}
              estimatedDurationMin={Math.round(booking.estimatedDuration)}
            />

            {activeIdx >= 0 && (
              <ol className="space-y-2">
                {TIMELINE.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                        i <= activeIdx
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < activeIdx ? "✓" : i + 1}
                    </span>
                    <span className={i <= activeIdx ? "font-medium" : "text-muted-foreground"}>
                      {STATUS_META[s].label}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">From:</span> {booking.pickupLocation}</p>
              {booking.stops
                ?.filter((s) => s.stopType === "WAYPOINT")
                .map((s, i) => (
                  <p key={s.id}>
                    <span className="text-muted-foreground">Stop {i + 1}:</span> {s.location}
                  </p>
                ))}
              <p><span className="text-muted-foreground">To:</span> {booking.dropoffLocation}</p>
              {booking.scheduledTime && (
                <p className="text-muted-foreground">
                  Scheduled: {new Date(booking.scheduledTime).toLocaleString()}
                </p>
              )}
              <p className="flex justify-between pt-1">
                <span className="text-muted-foreground">{booking.estimatedDistance} km · {Math.round(booking.estimatedDuration)} min</span>
                <span className="font-semibold">{currency(payable)}</span>
              </p>
              {booking.discountAmount ? (
                <p className="text-xs text-emerald-600">
                  Coupon {booking.couponCode}: -{currency(booking.discountAmount)} off
                </p>
              ) : null}
            </div>

            {booking.driver && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{booking.driver.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {booking.driver.licensePlate} · ⭐ {booking.driver.rating}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${booking.driver.phoneNumber}`}>
                    <Phone className="mr-1 h-3.5 w-3.5" /> Call
                  </a>
                </Button>
              </div>
            )}

            {user && canCancel && (
              <Button variant="destructive" className="w-full" onClick={() => setCancelOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel booking
              </Button>
            )}

            {user && booking.status === "COMPLETED" && booking.paymentStatus !== "PAID" && (
              <Button className="w-full" size="lg" onClick={() => setPayOpen(true)}>
                Pay {currency(payable)}
              </Button>
            )}

            {user && booking.status === "COMPLETED" && booking.paymentStatus === "PAID" && (
              <div className="space-y-2">
                <p className="text-center text-sm text-emerald-600">Payment complete ✓</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={downloadInvoice}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download invoice (PDF)
                </Button>
              </div>
            )}

            {user && booking.status === "COMPLETED" && (
              <div className="rounded-lg border p-3 text-center">
                {booking.rating ? (
                  <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> You rated {booking.rating}★
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-sm font-medium">Rate your driver</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`}>
                          <Star
                            className={`h-7 w-7 ${
                              n <= ratingValue ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {user && booking.driver && !["CANCELLED", "REJECTED"].includes(booking.status) && (
          <ChatPanel bookingId={id} userId={user.id} role="USER" />
        )}
      </div>

      <PaymentCheckout
        open={payOpen}
        onOpenChange={setPayOpen}
        purpose={{ type: "booking", bookingId: id, amount: payable }}
        onSuccess={() => {
          toast({ title: "Payment successful" });
          load();
        }}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          {booking.paymentStatus === "PAID" && (
            <p className="text-sm text-muted-foreground">
              Your fare will be refunded to your wallet.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" disabled={cancelling} onClick={confirmCancel}>
              {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TrackPage() {
  const params = useParams();
  const id = String(params.id);
  return <TrackInner id={id} />;
}
