"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[280px] w-full place-items-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function LiveMap(props: {
  markers: MapMarker[];
  showRoute?: boolean;
  className?: string;
}) {
  return <MapView {...props} />;
}

export type { MapMarker };
