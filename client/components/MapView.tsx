"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  kind: "pickup" | "dropoff" | "driver" | "waypoint";
}

const COLORS: Record<MapMarker["kind"], string> = {
  pickup: "#2563eb",
  dropoff: "#16a34a",
  driver: "#f59e0b",
  waypoint: "#9333ea",
};

const makeIcon = (kind: MapMarker["kind"]) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${COLORS[kind]};border:3px solid white;
      box-shadow:0 0 0 2px ${COLORS[kind]};"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, markers]);
  return null;
}

export default function MapView({
  markers,
  showRoute = false,
  className = "",
}: {
  markers: MapMarker[];
  showRoute?: boolean;
  className?: string;
}) {
  const center: [number, number] = markers[0]
    ? [markers[0].lat, markers[0].lng]
    : [12.9716, 77.5946];

  const route = markers.filter((m) => m.kind !== "driver");

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
      style={{ minHeight: 280, borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showRoute && route.length >= 2 && (
        <Polyline
          positions={route.map((m) => [m.lat, m.lng])}
          pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.6, dashArray: "8 8" }}
        />
      )}
      {markers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={makeIcon(m.kind)}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
      <FitBounds markers={markers} />
    </MapContainer>
  );
}
