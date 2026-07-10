"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import {
  CreditCard,
  IndianRupee,
  Loader2,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { currency } from "@/lib/ui";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export type PaymentPurpose =
  | { type: "booking"; bookingId: string; amount: number }
  | { type: "wallet_topup"; amount: number };

type PaymentMethod = "wallet" | "razorpay";

interface PaymentCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: PaymentPurpose | null;
  onSuccess?: () => void;
}

export function PaymentCheckout({
  open,
  onOpenChange,
  purpose,
  onSuccess,
}: PaymentCheckoutProps) {
  const [method, setMethod] = useState<PaymentMethod>("razorpay");
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [config, setConfig] = useState<{
    mode: "razorpay" | "mock";
    keyId: string | null;
  } | null>(null);
  const [mockOpen, setMockOpen] = useState(false);
  const [mockOrder, setMockOrder] = useState<{
    intentId: string;
    order: { id: string; amount: number };
  } | null>(null);
  const [error, setError] = useState("");

  const amount = purpose?.amount ?? 0;

  const loadWallet = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([api.getWallet(), api.getPaymentConfig()]);
      setWalletBalance(w.wallet.balance);
      setConfig(c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError("");
      setMethod("razorpay");
      loadWallet();
    }
  }, [open, loadWallet]);

  const payWithWallet = async () => {
    if (!purpose || purpose.type !== "booking") {
      setError("Wallet can only pay for bookings");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { intent } = await api.createPaymentIntent(purpose.bookingId);
      await api.confirmPayment(intent.id, "wallet");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const startRazorpay = async () => {
    if (!purpose) return;
    setLoading(true);
    setError("");
    try {
      const orderPayload =
        purpose.type === "booking"
          ? await api.createRazorpayOrder({ bookingId: purpose.bookingId })
          : await api.createRazorpayOrder({ topup: true, amount: purpose.amount });

      if (orderPayload.mode === "mock" || !orderPayload.keyId) {
        setMockOrder({
          intentId: orderPayload.intentId,
          order: orderPayload.order,
        });
        setMockOpen(true);
        setLoading(false);
        return;
      }

      if (!window.Razorpay) {
        setError("Razorpay checkout failed to load");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.order.amount,
        currency: "INR",
        name: "QuickMove",
        description:
          purpose.type === "booking" ? "Trip payment" : "Wallet top-up",
        order_id: orderPayload.order.id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.verifyRazorpayPayment({
              intentId: orderPayload.intentId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            onOpenChange(false);
            onSuccess?.();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Verification failed");
          }
        },
        theme: { color: "#2563eb" },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  const completeMock = async (success: boolean) => {
    if (!mockOrder) return;
    setLoading(true);
    setError("");
    try {
      if (!success) {
        setError("Payment cancelled or declined");
        setMockOpen(false);
        return;
      }
      const mock = await api.mockRazorpayComplete(mockOrder.intentId, mockOrder.order.id);
      await api.verifyRazorpayPayment({
        intentId: mockOrder.intentId,
        orderId: mock.orderId,
        paymentId: mock.paymentId,
        signature: mock.signature,
      });
      setMockOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mock payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (method === "wallet") void payWithWallet();
    else void startRazorpay();
  };

  if (!purpose) return null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete payment</DialogTitle>
            <DialogDescription>
              Pay {currency(amount)} securely via Razorpay test mode
              {config?.mode === "mock" ? " (mock checkout — no keys needed)" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMethod("razorpay")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                method === "razorpay" && "border-primary ring-1 ring-primary"
              )}
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Card / UPI / Netbanking</p>
                <p className="text-xs text-muted-foreground">Powered by Razorpay</p>
              </div>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </button>

            {purpose.type === "booking" && (
              <button
                type="button"
                onClick={() => setMethod("wallet")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  method === "wallet" && "border-primary ring-1 ring-primary"
                )}
              >
                <Wallet className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">QuickMove Wallet</p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {currency(walletBalance)}
                    {walletBalance < amount ? " — insufficient" : ""}
                  </p>
                </div>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> {error}
            </p>
          )}

          <DialogFooter>
            <Button
              className="w-full"
              size="lg"
              disabled={loading || (method === "wallet" && walletBalance < amount)}
              onClick={handlePay}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Pay {currency(amount)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mockOpen} onOpenChange={setMockOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="bg-[#072654] px-4 py-3 text-white">
            <p className="text-sm font-semibold">Razorpay (Mock)</p>
            <p className="text-xs opacity-80">Test checkout — no real money</p>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm text-muted-foreground">Amount payable</p>
              <p className="text-2xl font-bold">{currency(amount)}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Choose an outcome to simulate Razorpay payment.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={loading}
                onClick={() => void completeMock(true)}
              >
                Pay successfully
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => void completeMock(false)}
              >
                Fail / cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
