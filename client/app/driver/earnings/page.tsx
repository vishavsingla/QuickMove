"use client";

import { useEffect, useState } from "react";
import { Loader2, IndianRupee, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/ui";

function EarningsInner() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.driverEarnings>> | null>(null);

  useEffect(() => {
    api.driverEarnings().then(setData).catch(() => setData(null));
  }, []);

  if (!data)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const { summary, transactions } = data;

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Earnings dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Trip payouts credited to your wallet after customers pay.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5" /> Available balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{currency(summary.balance)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total earned: {currency(summary.totalEarnings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" /> This week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{currency(summary.weekEarnings)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.tripCount} paid trip{summary.tripCount !== 1 ? "s" : ""} total
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.pendingTrips > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 text-sm">
            {summary.pendingTrips} completed trip{summary.pendingTrips > 1 ? "s" : ""} awaiting
            customer payment.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            transactions.map((t) => (
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
                    {t.booking && ` · Fare ${currency(t.booking.estimatedCost)}`}
                  </p>
                </div>
                <span className="font-semibold text-emerald-600">+{currency(t.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Platform commission: {(summary.commissionRate * 100).toFixed(0)}%. You receive{" "}
        {((1 - summary.commissionRate) * 100).toFixed(0)}% of each paid fare.
      </p>
    </div>
  );
}

export default function DriverEarningsPage() {
  return (
    <RequireRole role="DRIVER">
      <EarningsInner />
    </RequireRole>
  );
}
