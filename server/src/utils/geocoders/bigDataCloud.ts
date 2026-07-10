import type { GeoResult } from "../geo";
import { geoHttp } from "./http";

/** Tertiary reverse geocoder — free client endpoint, no API key. */
export const reverseBigDataCloud = async (
  lat: number,
  lng: number
): Promise<GeoResult | null> => {
  const { data } = await geoHttp.get(
    "https://api.bigdatacloud.net/data/reverse-geocode-client",
    { params: { latitude: lat, longitude: lng, localityLanguage: "en" } }
  );
  const d = data as {
    locality?: string;
    city?: string;
    principalSubdivision?: string;
    countryName?: string;
  };
  const parts = [
    d.locality,
    d.city,
    d.principalSubdivision,
    d.countryName,
  ].filter(Boolean);
  const displayName = [...new Set(parts)].join(", ");
  if (!displayName) return null;
  return { displayName, lat, lng };
};
