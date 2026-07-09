import axios from "axios";
import { env } from "../config/env";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoResult extends GeoPoint {
  displayName: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  source: "osrm" | "haversine";
}

const ROAD_FACTOR = 1.35; // straight-line -> approximate road distance
const AVG_SPEED_KMH = 28; // urban average for fallback duration

export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Free-text address search via Nominatim. Returns [] if the service is
 * unreachable so callers can degrade gracefully.
 */
export const geocode = async (query: string): Promise<GeoResult[]> => {
  if (!query || query.trim().length < 3) return [];
  try {
    const { data } = await axios.get(`${env.nominatimUrl}/search`, {
      params: { q: query, format: "json", limit: 6, addressdetails: 0 },
      headers: { "User-Agent": "QuickMove/1.0 (logistics demo)" },
      timeout: 6000,
    });
    return (data as any[]).map((r) => ({
      displayName: r.display_name as string,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
};

/**
 * Road distance + duration via OSRM. Falls back to a haversine estimate when
 * OSRM is unreachable, so the platform works with zero external dependencies.
 */
export const routeBetween = async (
  origin: GeoPoint,
  dest: GeoPoint
): Promise<RouteResult> => {
  try {
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const { data } = await axios.get(
      `${env.osrmUrl}/route/v1/driving/${coords}`,
      { params: { overview: "false" }, timeout: 6000 }
    );
    const route = (data as any)?.routes?.[0];
    if (route) {
      return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        source: "osrm",
      };
    }
  } catch {
    /* fall through to haversine */
  }
  const straight = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const distanceKm = straight * ROAD_FACTOR;
  return {
    distanceKm,
    durationMin: (distanceKm / AVG_SPEED_KMH) * 60,
    source: "haversine",
  };
};

/** Sum leg distances for multi-stop routes (pickup → waypoints → dropoff). */
export const routeThrough = async (points: GeoPoint[]): Promise<RouteResult> => {
  if (points.length < 2) {
    return { distanceKm: 0, durationMin: 0, source: "haversine" };
  }
  let distanceKm = 0;
  let durationMin = 0;
  let source: RouteResult["source"] = "osrm";
  for (let i = 0; i < points.length - 1; i++) {
    const leg = await routeBetween(points[i], points[i + 1]);
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
    if (leg.source === "haversine") source = "haversine";
  }
  return { distanceKm, durationMin, source };
};
