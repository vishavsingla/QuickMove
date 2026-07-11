"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, IndianRupee, TrendingUp, Landmark, ArrowDownToLine } from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { currency } from "@/lib/ui";

function EarningsInner() {
  const { toast } = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.driverEarnings>> | null>(null);
  const [payouts, setPayouts] = useState<
    Awaited<ReturnType<typeof api.driverPayouts>>["payouts"]
  >([]);
  const [bankAccNo, setBankAccNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [e, p, profile] = await Promise.all([
        api.driverEarnings(),
        api.driverPayouts().catch(() => ({ payouts: [] })),
        api.driverProfile(),
      ]);
      setData(e);
      setPayouts(p.payouts);
      if (profile.driver.bankAccNo) setBankAccNo(profile.driver.bankAccNo);
      if (profile.driver.ifscCode) setIfscCode(profile.driver.ifscCode);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveBank = async () => {
    try {
      await api.updateDriverBank(bankAccNo, ifscCode);
      toast({ title: "Bank details saved" });
    } catch {
      toast({ title: "Could not save bank details", variant: "destructive" });
    }
  };

  const withdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) {
      toast({ title: "Minimum withdrawal is ₹100", variant: "destructive" });
      return;
    }
    setWithdrawing(true);
    try {
      const r = await api.driverWithdraw(amount);
      toast({ title: r.message });
      setWithdrawAmount("");
      load();
    } catch (e: any) {
      toast({ title: e?.message || "Withdrawal failed", variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loadError)
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">Could not load earnings.</p>
        <Button variant="outline" onClick={() => load()}>
          Retry
        </Button>
      </div>
    );

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5" /> Bank account
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Account number</label>
            <Input
              value={bankAccNo}
              onChange={(e) => setBankAccNo(e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">IFSC code</label>
            <Input
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="HDFC0001234"
            />
          </div>
          <Button className="sm:col-span-2" variant="outline" onClick={saveBank}>
            Save bank details
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowDownToLine className="h-5 w-5" /> Withdraw to bank
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Amount (min ₹100)</label>
            <Input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <Button onClick={withdraw} disabled={withdrawing || summary.balance < 100}>
            {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Withdraw
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Test mode: withdrawals are instant stub payouts to your saved bank account.
          </p>
        </CardContent>
      </Card>

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
          <CardTitle className="text-lg">Trip payout history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trip payouts yet.</p>
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
                  </p>
                </div>
                <span className="font-semibold text-emerald-600">+{currency(t.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank withdrawal history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
          ) : (
            payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">Bank transfer</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()} · {p.status}
                  </p>
                </div>
                <span className="font-semibold text-red-600">-{currency(p.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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
