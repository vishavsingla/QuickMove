import type { GeoResult } from "../geo";
import type { GeocoderProvider, ScoredResult } from "./types";

const haversineKm = (
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

const PROVIDER_WEIGHT: Record<GeocoderProvider, number> = {
  photon: 30,
  nominatim: 25,
  openmeteo: 15,
  bigdatacloud: 10,
  local: 5,
};

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Relevance score for ranking merged provider results. */
export const scoreResult = (
  query: string,
  result: GeoResult,
  provider: GeocoderProvider
): number => {
  const q = normalize(query);
  const name = normalize(result.displayName);
  const primary = name.split(",")[0]?.trim() ?? name;
  const words = q.split(" ").filter(Boolean);

  let textScore = 0;
  if (name === q || primary === q) textScore = 100;
  else if (primary.startsWith(q) || name.startsWith(q)) textScore = 80;
  else if (words.length > 1 && words.every((w) => name.includes(w))) textScore = 70;
  else if (name.includes(q)) textScore = 55;
  else if (words.some((w) => primary.startsWith(w) || name.includes(` ${w}`)))
    textScore = 40;
  else if (words.some((w) => name.includes(w))) textScore = 25;

  // Boost well-known Indian place names on short partial queries (e.g. "man" → Manali).
  const shortQuery = q.length <= 3;
  const isIndia = /india|, in\b/.test(name);
  const indiaBoost =
    isIndia && shortQuery && primary.startsWith(q)
      ? 18
      : isIndia
        ? 8
        : 0;

  return textScore + PROVIDER_WEIGHT[provider] + indiaBoost;
};

const nearDuplicate = (a: GeoResult, b: GeoResult): boolean => {
  if (normalize(a.displayName) === normalize(b.displayName)) return true;
  return haversineKm(a.lat, a.lng, b.lat, b.lng) < 0.15;
};

/** Merge, dedupe by proximity/name, and rank by relevance. */
export const mergeAndRank = (
  query: string,
  batches: Array<{ provider: GeocoderProvider; results: GeoResult[] }>,
  limit = 8
): GeoResult[] => {
  const scored: ScoredResult[] = [];

  for (const batch of batches) {
    for (const result of batch.results) {
      if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) continue;
      scored.push({
        ...result,
        provider: batch.provider,
        score: scoreResult(query, result, batch.provider),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const picked: ScoredResult[] = [];
  for (const candidate of scored) {
    if (picked.some((p) => nearDuplicate(p, candidate))) continue;
    picked.push(candidate);
    if (picked.length >= limit) break;
  }

  return picked.map(({ displayName, lat, lng }) => ({ displayName, lat, lng }));
};
