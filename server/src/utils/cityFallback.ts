import type { GeoResult } from "./geo";

/** Last-resort offline index when all geocoding providers are unreachable. */
export const INDIAN_CITIES: GeoResult[] = [
  { displayName: "Chandigarh, India", lat: 30.7334, lng: 76.7797 },
  { displayName: "Manali, Himachal Pradesh, India", lat: 32.2432, lng: 77.1892 },
  { displayName: "Delhi, India", lat: 28.6139, lng: 77.209 },
  { displayName: "Mumbai, Maharashtra, India", lat: 19.076, lng: 72.8777 },
  { displayName: "Bengaluru, Karnataka, India", lat: 12.9716, lng: 77.5946 },
];

export const searchLocalCities = (query: string, limit = 6): GeoResult[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const words = q.split(/\s+/).filter(Boolean);
  const scored = INDIAN_CITIES.map((city) => {
    const name = city.displayName.toLowerCase();
    const exact = name === q || name.startsWith(q);
    const contains = name.includes(q);
    const allWords = words.every((w) => name.includes(w));
    const score = exact ? 3 : contains ? 2 : allWords ? 1 : 0;
    return { city, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((r) => r.city);
};

export const nearestLocalCity = (
  lat: number,
  lng: number,
  maxKm = 80
): GeoResult | null => {
  let best: GeoResult | null = null;
  let bestKm = Infinity;
  for (const city of INDIAN_CITIES) {
    const R = 6371;
    const dLat = ((city.lat - lat) * Math.PI) / 180;
    const dLng = ((city.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((city.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return bestKm < maxKm ? best : null;
};
