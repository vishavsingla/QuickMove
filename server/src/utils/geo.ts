import axios from "axios";
import { env } from "../config/env";
import { searchLocalCities, INDIAN_CITIES } from "./cityFallback";

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
  /** Leaflet-ready [lat, lng] pairs when OSRM geometry is available */
  geometry?: [number, number][];
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

const mapNominatimResults = (data: unknown[]): GeoResult[] =>
  data.map((r: any) => ({
    displayName: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

/**
 * Free-text address search via Nominatim with a built-in Indian city fallback
 * when the upstream service is unreachable, rate-limited, or returns nothing.
 */
export const geocode = async (query: string): Promise<GeoResult[]> => {
  if (!query || query.trim().length < 3) return [];

  let results: GeoResult[] = [];
  try {
    const { data } = await axios.get(`${env.nominatimUrl}/search`, {
      params: { q: query, format: "json", limit: 6, addressdetails: 0 },
      headers: { "User-Agent": "QuickMove/1.0 (logistics demo)" },
      timeout: 6000,
    });
    results = mapNominatimResults(data as unknown[]);
  } catch {
    /* Nominatim unreachable — fall through to local index */
  }

  if (results.length === 0) {
    results = searchLocalCities(query);
  }

  return results;
};

const nearestLocalCity = (lat: number, lng: number): GeoResult | null => {
  let best: GeoResult | null = null;
  let bestKm = Infinity;
  for (const city of INDIAN_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < bestKm) {
      bestKm = d;
      best = city;
    }
  }
  return bestKm < 80 ? best : null;
};

/** Lat/lng → human-readable address via Nominatim reverse, with local fallback. */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<GeoResult> => {
  try {
    const { data } = await axios.get(`${env.nominatimUrl}/reverse`, {
      params: { lat, lon: lng, format: "json" },
      headers: { "User-Agent": "QuickMove/1.0 (logistics demo)" },
      timeout: 6000,
    });
    const name = (data as { display_name?: string })?.display_name;
    if (name) return { displayName: name, lat, lng };
  } catch {
    /* fall through */
  }

  const nearby = nearestLocalCity(lat, lng);
  if (nearby) {
    return {
      displayName: `${nearby.displayName.split(",")[0]} area (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
    };
  }

  return {
    displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
  };
};

const parseOsrmGeometry = (route: any): [number, number][] | undefined => {
  const coords = route?.geometry?.coordinates as [number, number][] | undefined;
  if (!coords?.length) return undefined;
  return coords.map(([lng, lat]) => [lat, lng]);
};

const straightLineGeometry = (points: GeoPoint[]): [number, number][] =>
  points.map((p) => [p.lat, p.lng]);

/**
 * Road distance + duration via OSRM. Falls back to a haversine estimate when
 * OSRM is unreachable, so the platform works with zero external dependencies.
 */
export const routeBetween = async (
  origin: GeoPoint,
  dest: GeoPoint,
  withGeometry = false
): Promise<RouteResult> => {
  try {
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const { data } = await axios.get(
      `${env.osrmUrl}/route/v1/driving/${coords}`,
      {
        params: withGeometry
          ? { overview: "full", geometries: "geojson" }
          : { overview: "false" },
        timeout: 6000,
      }
    );
    const route = (data as any)?.routes?.[0];
    if (route) {
      return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        source: "osrm",
        ...(withGeometry
          ? { geometry: parseOsrmGeometry(route) ?? straightLineGeometry([origin, dest]) }
          : {}),
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
    ...(withGeometry ? { geometry: straightLineGeometry([origin, dest]) } : {}),
  };
};

/** Sum leg distances for multi-stop routes (pickup → waypoints → dropoff). */
export const routeThrough = async (
  points: GeoPoint[],
  withGeometry = false
): Promise<RouteResult> => {
  if (points.length < 2) {
    return {
      distanceKm: 0,
      durationMin: 0,
      source: "haversine",
      ...(withGeometry ? { geometry: [] } : {}),
    };
  }

  if (withGeometry && points.length >= 2) {
    try {
      const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
      const { data } = await axios.get(
        `${env.osrmUrl}/route/v1/driving/${coordStr}`,
        { params: { overview: "full", geometries: "geojson" }, timeout: 8000 }
      );
      const route = (data as any)?.routes?.[0];
      if (route) {
        return {
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
          source: "osrm",
          geometry:
            parseOsrmGeometry(route) ?? straightLineGeometry(points),
        };
      }
    } catch {
      /* fall through to per-leg routing */
    }
  }

  let distanceKm = 0;
  let durationMin = 0;
  let source: RouteResult["source"] = "osrm";
  const geometry: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const leg = await routeBetween(points[i], points[i + 1], withGeometry);
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
    if (leg.source === "haversine") source = "haversine";
    if (withGeometry && leg.geometry) {
      if (geometry.length && leg.geometry.length) geometry.pop();
      geometry.push(...leg.geometry);
    }
  }
  return {
    distanceKm,
    durationMin,
    source,
    ...(withGeometry
      ? { geometry: geometry.length ? geometry : straightLineGeometry(points) }
      : {}),
  };
};
