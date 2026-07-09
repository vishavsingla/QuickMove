"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PackagePlus } from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_META, VEHICLE_META, currency } from "@/lib/ui";
import type { Booking } from "@/lib/types";

function BookingsInner() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    api.myBookings().then((r) => setBookings(r.bookings)).catch(() => setBookings([]));
  }, []);

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <Button asChild>
          <Link href="/book">
            <PackagePlus className="mr-2 h-4 w-4" /> New move
          </Link>
        </Button>
      </div>

      {bookings === null ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <PackagePlus className="h-10 w-10 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No bookings yet.</p>
            <Button asChild>
              <Link href="/book">Book your first move</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{VEHICLE_META[b.vehicleType].icon}</span>
                      <Badge variant={STATUS_META[b.status].variant}>
                        {STATUS_META[b.status].label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm">
                      {b.pickupLocation.split(",")[0]} → {b.dropoffLocation.split(",")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()} · {b.estimatedDistance} km
                    </p>
                  </div>
                  <div className="text-right font-semibold">{currency(b.estimatedCost)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <RequireRole role="USER">
      <BookingsInner />
    </RequireRole>
  );
}
