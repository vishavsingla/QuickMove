"use client";

import Link from "next/link";
import {
  MapPin,
  Truck,
  Zap,
  ShieldCheck,
  Radio,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VEHICLE_META } from "@/lib/ui";
import type { VehicleType } from "@/lib/types";

const features = [
  {
    icon: Radio,
    title: "Live tracking",
    body: "Follow your driver on the map in real time over a WebSocket layer.",
  },
  {
    icon: IndianRupee,
    title: "Transparent pricing",
    body: "Instant fare estimates per vehicle with distance, time and surge shown up front.",
  },
  {
    icon: Zap,
    title: "Fast matching",
    body: "Nearby, available drivers are offered your job the moment you book.",
  },
  {
    icon: ShieldCheck,
    title: "Verified drivers",
    body: "Every driver and vehicle is reviewed and approved before going live.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container grid gap-10 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Logistics & moving, reimagined
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Move anything,
              <br />
              <span className="text-primary">anywhere</span> — right now.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              QuickMove connects you with nearby drivers for bikes, tempos and
              trucks. Get an instant quote, book in seconds — no account required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/book">
                  <MapPin className="mr-2 h-4 w-4" /> Book a move
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup/driver">Drive with us</Link>
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="grid w-full max-w-md grid-cols-2 gap-4">
              {(Object.keys(VEHICLE_META) as VehicleType[]).map((vt) => (
                <div
                  key={vt}
                  className="rounded-2xl border bg-card p-5 shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div className="text-3xl">{VEHICLE_META[vt].icon}</div>
                  <div className="mt-2 font-semibold">{VEHICLE_META[vt].label}</div>
                  <div className="text-xs text-muted-foreground">
                    {VEHICLE_META[vt].blurb}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { n: "1", t: "Set pickup & drop-off", d: "Search addresses and see the route on the map." },
              { n: "2", t: "Pick a vehicle & price", d: "Compare live fares across vehicle types and book." },
              { n: "3", t: "Track it live", d: "Watch your driver arrive and complete the move in real time." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link href="/book">Book without an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} QuickMove</span>
          <span>Built with Next.js, Express, Postgres & WebSockets</span>
        </div>
      </footer>
    </div>
  );
}
