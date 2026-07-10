"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  IndianRupee,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Wallet as WalletIcon,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentModeBadge } from "@/components/PaymentModeBadge";
import { paymentModeDescription } from "@/lib/payment-mode";
import { useToast } from "@/hooks/use-toast";
import { currency } from "@/lib/ui";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [100, 500, 1000, 2000] as const;

function WalletInner() {
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"razorpay" | "mock">("mock");

  const load = async () => {
    const [w, c] = await Promise.all([api.getWallet(), api.getPaymentConfig()]);
    setBalance(w.wallet.balance);
    setTxns(w.transactions);
    setPaymentMode(c.mode);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const parsedAmount = Number(amount);
  const amountValid = parsedAmount > 0 && parsedAmount <= 100_000;

  const selectQuickAmount = (v: number) => {
    setAmount(String(v));
  };

  const instantTopUp = async () => {
    if (!amountValid) return;
    setTopupLoading(true);
    try {
      await api.topUpWallet(parsedAmount);
      toast({
        title: "Wallet credited",
        description: `${currency(parsedAmount)} added instantly (test gateway).`,
      });
      await load();
    } catch {
      toast({ title: "Top-up failed", variant: "destructive" });
    } finally {
      setTopupLoading(false);
    }
  };

  const openRazorpayTopup = () => {
    if (!amountValid) return;
    setTopupAmount(parsedAmount);
    setCheckoutOpen(true);
  };

  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <PaymentModeBadge mode={paymentMode} />
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <WalletIcon className="h-4 w-4" />
                Available balance
              </p>
              <p className="mt-2 text-5xl font-bold tracking-tight">{currency(balance)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Use wallet balance to pay for completed trips, or add money below.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add money
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={parsedAmount === v ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectQuickAmount(v)}
                >
                  {currency(v)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Custom amount (₹1 – ₹1,00,000)</p>
            <Input
              type="number"
              min={1}
              max={100_000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="max-w-[200px]"
            />
            {!amountValid && amount !== "" && (
              <p className="text-xs text-destructive">Enter an amount between ₹1 and ₹1,00,000</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              size="lg"
              disabled={!amountValid || topupLoading}
              onClick={openRazorpayTopup}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {paymentMode === "mock" ? "Add via mock checkout" : "Add via Razorpay test"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={!amountValid || topupLoading}
              onClick={instantTopUp}
            >
              {topupLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Instant test credit
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {paymentModeDescription(paymentMode)} Instant test credit skips checkout for quick demos.
          </p>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Test pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Go to Book and set pickup + drop-off — fares appear automatically.</li>
            <li>Pick a vehicle and book; after the trip completes, pay with wallet or Razorpay.</li>
            <li>Demo login starts with ₹2,000 — top up here if you need more.</li>
          </ol>
          <Button asChild variant="secondary" size="sm">
            <Link href="/book">
              Book a move
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {txns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            txns.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-medium",
                    t.type === "CREDIT" ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {t.type === "CREDIT" ? "+" : "-"}
                  {currency(t.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <PaymentCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        purpose={{ type: "wallet_topup", amount: topupAmount }}
        autoStart
        onSuccess={() => {
          toast({
            title: "Wallet topped up",
            description: `${currency(topupAmount)} added via Razorpay.`,
          });
          load();
        }}
      />
    </div>
  );
}

export default function WalletPage() {
  return (
    <RequireRole role="USER">
      <WalletInner />
    </RequireRole>
  );
}
