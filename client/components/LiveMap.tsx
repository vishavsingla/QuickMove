"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[400px] w-full place-items-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function LiveMap(props: {
  markers: MapMarker[];
  showRoute?: boolean;
  routePath?: [number, number][];
  className?: string;
  onMarkerDrag?: (marker: MapMarker, lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  mapClickEnabled?: boolean;
}) {
  return <MapView {...props} />;
}

export type { MapMarker };
