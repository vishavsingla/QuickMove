import type { GeoResult } from "../geo";

export type GeocoderProvider = "photon" | "nominatim" | "openmeteo" | "bigdatacloud" | "local";

export interface ScoredResult extends GeoResult {
  provider: GeocoderProvider;
  score: number;
}
