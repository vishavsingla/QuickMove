"use client";

import { useEffect, useState } from "react";
import { Loader2, IndianRupee, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { currency } from "@/lib/ui";

function WalletInner() {
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await api.getWallet();
    setBalance(r.wallet.balance);
    setTxns(r.transactions);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const topUp = async () => {
    const v = Number(amount);
    if (!v || v <= 0) return;
    try {
      await api.topUpWallet(v);
      toast({ title: "Wallet topped up" });
      load();
    } catch {
      toast({ title: "Top-up failed", variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IndianRupee className="h-5 w-5" /> Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{currency(balance)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Test gateway — top-ups are instant in demo mode.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="max-w-[140px]"
            />
            <Button onClick={topUp}>
              <Plus className="mr-1 h-4 w-4" /> Top up
            </Button>
          </div>
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
                  className={
                    t.type === "CREDIT" ? "text-emerald-600" : "text-red-600"
                  }
                >
                  {t.type === "CREDIT" ? "+" : "-"}
                  {currency(t.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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
