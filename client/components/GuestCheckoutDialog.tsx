"use client";

import { useState } from "react";
import { Loader2, Phone, User } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export interface GuestDetails {
  name: string;
  phoneNumber: string;
  email?: string;
  phoneVerificationToken?: string;
}

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: GuestDetails) => void | Promise<void>;
  loading?: boolean;
  vehicleLabel?: string;
  fareLabel?: string;
}

type Step = "details" | "otp" | "confirm";

export function GuestCheckoutDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  vehicleLabel,
  fareLabel,
}: GuestCheckoutDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string>();

  const canSubmit = name.trim().length >= 2 && phoneNumber.trim().length >= 8;

  const reset = () => {
    setStep("details");
    setOtpCode("");
    setOtpSent(false);
    setDebugOtp(null);
    setPhoneVerificationToken(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await api.sendGuestOtp(phoneNumber.trim());
      setOtpSent(true);
      if (res.debugOtp) setDebugOtp(res.debugOtp);
      toast({ title: "Code sent", description: res.debugOtp ? `Demo: ${res.debugOtp}` : undefined });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      const res = await api.verifyGuestOtp(phoneNumber.trim(), otpCode);
      setPhoneVerificationToken(res.phoneVerificationToken);
      setStep("confirm");
      toast({ title: "Phone verified" });
    } catch (err) {
      toast({
        title: "Invalid code",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleConfirm = () => {
    void onConfirm({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      phoneVerificationToken,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "otp" ? "Verify your phone" : "Continue with phone"}
          </DialogTitle>
          <DialogDescription>
            {step === "otp"
              ? "Optional — helps us confirm your number before the move."
              : vehicleLabel && fareLabel
                ? `Confirm your ${vehicleLabel} booking (${fareLabel}).`
                : "No account needed — we'll create one from your phone."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="guest-name">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="guest-name"
                  className="pl-9"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="guest-phone">
                Mobile number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="guest-phone"
                  className="pl-9"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="guest-email">
                Email <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="guest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3 py-2">
            {!otpSent ? (
              <Button type="button" className="w-full" disabled={sendingOtp} onClick={sendOtp}>
                {sendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send verification code
              </Button>
            ) : (
              <>
                {debugOtp && (
                  <p className="text-center text-xs text-amber-600">Demo OTP: {debugOtp}</p>
                )}
                <div className="space-y-1.5">
                  <Label>6-digit code</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={otpCode.length < 6 || verifyingOtp}
                  onClick={verifyOtp}
                >
                  {verifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </>
            )}
            <Button type="button" variant="link" className="w-full" onClick={() => setStep("confirm")}>
              Skip verification
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-2 py-2 text-sm">
            <p>Name: {name}</p>
            <p>
              Phone: {phoneNumber}
              {phoneVerificationToken && (
                <span className="ml-2 text-xs text-green-600">Verified</span>
              )}
            </p>
            {email && <p>Email: {email}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "details" && (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Back
              </Button>
              <Button type="button" disabled={!canSubmit} onClick={() => setStep("otp")}>
                Continue
              </Button>
            </>
          )}
          {step === "otp" && (
            <Button type="button" variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
          )}
          {step === "confirm" && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("otp")}>
                Back
              </Button>
              <Button type="button" disabled={loading} onClick={handleConfirm}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm booking
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
