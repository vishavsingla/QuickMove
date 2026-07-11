"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Channel = "phone" | "email";

interface VerificationSectionProps {
  channel: Channel;
  target: string;
  verified: boolean;
  label: string;
  onVerified: () => void;
}

export function VerificationBadge({ verified }: { verified?: boolean }) {
  if (verified) {
    return (
      <Badge variant="success" className="gap-1 font-normal">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
      Unverified
    </Badge>
  );
}

export function VerificationSection({
  channel,
  target,
  verified,
  label,
  onVerified,
}: VerificationSectionProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const send = async () => {
    if (!target.trim()) return;
    setSending(true);
    try {
      const res = await api.sendOtp(channel, target);
      setSent(true);
      if (res.debugOtp) setDebugOtp(res.debugOtp);
      toast({
        title: "OTP sent",
        description: res.debugOtp
          ? `Demo code: ${res.debugOtp}`
          : `Check your ${channel === "email" ? "inbox" : "messages"}`,
      });
    } catch (err) {
      toast({
        title: "Could not send OTP",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    try {
      await api.verifyOtp(channel, target, code.trim());
      toast({ title: `${label} verified` });
      setCode("");
      setSent(false);
      setDebugOtp(null);
      onVerified();
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>{label} verified</span>
        <VerificationBadge verified />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Verify {label.toLowerCase()} (optional)</p>
        <VerificationBadge verified={false} />
      </div>
      <p className="text-xs text-muted-foreground">
        Optional — verification never blocks booking or login.
      </p>
      {!sent ? (
        <Button type="button" variant="outline" size="sm" onClick={send} disabled={sending}>
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send OTP to {target}
        </Button>
      ) : (
        <div className="space-y-2">
          {debugOtp && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Demo OTP: <b>{debugOtp}</b>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`otp-${channel}`}>Enter 6-digit code</Label>
            <Input
              id={`otp-${channel}`}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={verify} disabled={verifying || code.length < 6}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={send} disabled={sending}>
              Resend
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
