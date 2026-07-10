import { env } from "../../config/env";
import type { GeoResult } from "../geo";
import { geoHttp } from "./http";

const mapSearch = (data: unknown[]): GeoResult[] =>
  data.map((r: any) => ({
    displayName: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

export const searchNominatim = async (
  query: string,
  limit = 8
): Promise<GeoResult[]> => {
  const { data } = await geoHttp.get(`${env.nominatimUrl}/search`, {
    params: { q: query, format: "json", limit, addressdetails: 0 },
  });
  return mapSearch(data as unknown[]);
};

export const reverseNominatim = async (
  lat: number,
  lng: number
): Promise<GeoResult | null> => {
  const { data } = await geoHttp.get(`${env.nominatimUrl}/reverse`, {
    params: { lat, lon: lng, format: "json" },
  });
  const name = (data as { display_name?: string })?.display_name;
  if (!name) return null;
  return { displayName: name, lat, lng };
};
