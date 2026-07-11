"use client";

import { useState } from "react";
import { Loader2, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface GuestDetails {
  name: string;
  phoneNumber: string;
  email?: string;
}

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: GuestDetails) => void | Promise<void>;
  loading?: boolean;
  vehicleLabel?: string;
  fareLabel?: string;
}

export function GuestCheckoutDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  vehicleLabel,
  fareLabel,
}: GuestCheckoutDialogProps) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const canSubmit = name.trim().length >= 2 && phoneNumber.trim().length >= 8;

  const handleSubmit = () => {
    if (!canSubmit) return;
    void onConfirm({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Continue with phone</DialogTitle>
          <DialogDescription>
            {vehicleLabel && fareLabel
              ? `Confirm your ${vehicleLabel} booking (${fareLabel}). We'll use your phone to track the move.`
              : "Enter your details to confirm the booking. No account needed — we'll create one from your phone."}
          </DialogDescription>
        </DialogHeader>

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

          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/login?next=/book" className="text-primary underline-offset-4 hover:underline">
              Log in
            </a>{" "}
            to use saved addresses and wallet.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button type="button" disabled={!canSubmit || loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
