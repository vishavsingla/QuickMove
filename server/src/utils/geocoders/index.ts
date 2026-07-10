import type { GeoResult } from "../geo";
import { searchLocalCities, nearestLocalCity } from "../cityFallback";
import { searchNominatim, reverseNominatim } from "./nominatim";
import { searchPhoton, reversePhoton } from "./photon";
import { searchOpenMeteo } from "./openMeteo";
import { reverseBigDataCloud } from "./bigDataCloud";
import { mergeAndRank } from "./merge";

const settle = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch {
    return null;
  }
};

/**
 * Multi-provider forward geocode: Photon + Nominatim + Open-Meteo, merged and ranked.
 * Falls back to a tiny offline city list only when every provider fails.
 */
export const forwardGeocode = async (query: string): Promise<GeoResult[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const [photon, nominatim, openmeteo] = await Promise.all([
    settle(() => searchPhoton(q, 8)),
    settle(() => searchNominatim(q, 8)),
    settle(() => searchOpenMeteo(q, 6)),
  ]);

  const local = searchLocalCities(q, 4);

  const merged = mergeAndRank(q, [
    { provider: "photon", results: photon ?? [] },
    { provider: "nominatim", results: nominatim ?? [] },
    { provider: "openmeteo", results: openmeteo ?? [] },
    { provider: "local", results: local },
  ], 10);

  if (merged.length > 0) return merged;
  return local;
};

/**
 * Multi-provider reverse geocode: Nominatim → Photon → BigDataCloud → nearest local city.
 */
export const reverseGeocodeMulti = async (
  lat: number,
  lng: number
): Promise<GeoResult> => {
  const nominatim = await settle(() => reverseNominatim(lat, lng));
  if (nominatim) return nominatim;

  const photon = await settle(() => reversePhoton(lat, lng));
  if (photon) return photon;

  const bdc = await settle(() => reverseBigDataCloud(lat, lng));
  if (bdc) return bdc;

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
