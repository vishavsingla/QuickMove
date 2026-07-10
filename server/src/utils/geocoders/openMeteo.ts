import { env } from "../../config/env";
import type { GeoResult } from "../geo";
import { geoHttp } from "./http";

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
}

const formatName = (r: OpenMeteoResult): string => {
  const parts = [r.name, r.admin2, r.admin1, r.country].filter(Boolean);
  return [...new Set(parts)].join(", ");
};

/** Tertiary forward geocoder — free, no API key (Open-Meteo geocoding API). */
export const searchOpenMeteo = async (
  query: string,
  limit = 6
): Promise<GeoResult[]> => {
  const { data } = await geoHttp.get(`${env.openMeteoUrl}/v1/search`, {
    params: { name: query, count: limit, language: "en", format: "json" },
  });
  const rows = (data as { results?: OpenMeteoResult[] })?.results ?? [];
  return rows.map((r) => ({
    displayName: formatName(r),
    lat: r.latitude,
    lng: r.longitude,
  }));
};
