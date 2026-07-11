"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { BookingStatus } from "@/lib/types";

interface EtaCountdownProps {
  status: BookingStatus;
  estimatedDurationMin: number;
}

export function EtaCountdown({ status, estimatedDurationMin }: EtaCountdownProps) {
  const [remaining, setRemaining] = useState(estimatedDurationMin);

  useEffect(() => {
    if (!["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(status)) return;

    const start = Date.now();
    const totalMs = estimatedDurationMin * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, Math.ceil((totalMs - elapsed) / 60000));
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [status, estimatedDurationMin]);

  if (!["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(status)) return null;

  const label =
    status === "IN_PROGRESS"
      ? "ETA to destination"
      : status === "ARRIVED"
        ? "Driver has arrived"
        : "Driver arriving in";

  if (status === "ARRIVED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <Clock className="h-4 w-4" /> {label}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
      <Clock className="h-4 w-4 text-primary" />
      <span>
        {label}: <strong>~{remaining} min</strong>
      </span>
    </div>
  );
}
