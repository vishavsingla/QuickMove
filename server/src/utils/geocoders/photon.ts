import { env } from "../../config/env";
import type { GeoResult } from "../geo";
import { geoHttp } from "./http";

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  type?: string;
}

const formatPhotonName = (p: PhotonProps): string => {
  const parts: string[] = [];
  const line1 = [p.housenumber, p.street, p.name].filter(Boolean).join(" ").trim();
  if (line1) parts.push(line1);
  else if (p.name) parts.push(p.name);
  if (p.city && p.city !== p.name) parts.push(p.city);
  if (p.state && p.state !== p.city) parts.push(p.state);
  if (p.country) parts.push(p.country);
  return parts.join(", ") || p.name || "Unknown place";
};

const mapPhotonFeatures = (features: any[]): GeoResult[] =>
  features
    .map((f) => {
      const coords = f?.geometry?.coordinates as [number, number] | undefined;
      if (!coords?.length) return null;
      const props = (f.properties || {}) as PhotonProps;
      return {
        displayName: formatPhotonName(props),
        lat: coords[1],
        lng: coords[0],
      } satisfies GeoResult;
    })
    .filter((r): r is GeoResult => r != null);

export const searchPhoton = async (
  query: string,
  limit = 8
): Promise<GeoResult[]> => {
  const { data } = await geoHttp.get(`${env.photonUrl}/api/`, {
    params: { q: query, limit },
  });
  return mapPhotonFeatures((data as any)?.features ?? []);
};

export const reversePhoton = async (
  lat: number,
  lng: number
): Promise<GeoResult | null> => {
  const { data } = await geoHttp.get(`${env.photonUrl}/reverse`, {
    params: { lat, lon: lng },
  });
  const results = mapPhotonFeatures((data as any)?.features ?? []);
  return results[0] ?? null;
};
