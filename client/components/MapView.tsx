"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  kind: "pickup" | "dropoff" | "driver" | "waypoint";
  stopIndex?: number;
}

const COLORS: Record<MapMarker["kind"], string> = {
  pickup: "#16a34a",
  dropoff: "#dc2626",
  driver: "#f59e0b",
  waypoint: "#9333ea",
};

const makeIcon = (kind: MapMarker["kind"]) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${COLORS[kind]};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

function FitBounds({
  markers,
  routePath,
}: {
  markers: MapMarker[];
  routePath?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [
      ...markers.map((m) => [m.lat, m.lng] as [number, number]),
      ...(routePath ?? []),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, markers, routePath]);
  return null;
}

function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick?: (lat: number, lng: number) => void;
  enabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function DraggableMarker({
  marker,
  onDragEnd,
}: {
  marker: MapMarker;
  onDragEnd?: (marker: MapMarker, lat: number, lng: number) => void;
}) {
  const draggable = marker.kind !== "driver" && !!onDragEnd;

  return (
    <Marker
      position={[marker.lat, marker.lng]}
      icon={makeIcon(marker.kind)}
      draggable={draggable}
      eventHandlers={
        draggable
          ? {
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onDragEnd?.(marker, lat, lng);
              },
            }
          : undefined
      }
    >
      {marker.label && <Popup>{marker.label}</Popup>}
    </Marker>
  );
}

export default function MapView({
  markers,
  showRoute = false,
  routePath,
  className = "",
  onMarkerDrag,
  onMapClick,
  mapClickEnabled = false,
}: {
  markers: MapMarker[];
  showRoute?: boolean;
  routePath?: [number, number][];
  className?: string;
  onMarkerDrag?: (marker: MapMarker, lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  mapClickEnabled?: boolean;
}) {
  const center: [number, number] = markers[0]
    ? [markers[0].lat, markers[0].lng]
    : [30.7334, 76.7797];

  const fallbackRoute =
    showRoute && markers.length >= 2
      ? markers
          .filter((m) => m.kind !== "driver")
          .map((m) => [m.lat, m.lng] as [number, number])
      : [];

  const polyline = routePath?.length ? routePath : fallbackRoute;

  return (
    <MapContainer
      center={center}
      zoom={markers.length ? 13 : 6}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
      style={{ minHeight: 400, borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} enabled={mapClickEnabled} />
      {polyline.length >= 2 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.75 }}
        />
      )}
      {markers.map((m, i) => (
        <DraggableMarker
          key={`${m.kind}-${m.stopIndex ?? i}`}
          marker={m}
          onDragEnd={onMarkerDrag}
        />
      ))}
      <FitBounds markers={markers} routePath={polyline} />
    </MapContainer>
  );
}
