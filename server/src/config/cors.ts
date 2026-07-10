/**
 * Parses allowed browser origins from env.
 * CORS_ORIGINS (comma-separated) takes precedence; CLIENT_ORIGIN is a fallback.
 * Supports wildcards, e.g. https://*.vercel.app
 */
export function parseCorsOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

export function isOriginAllowed(
  origin: string | undefined,
  allowed: string[]
): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, "");
  return allowed.some((pattern) => {
    if (pattern.includes("*")) {
      return patternToRegExp(pattern).test(normalized);
    }
    return pattern === normalized;
  });
}

export type CorsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => void;

export function createCorsOriginCallback(
  allowed: string[]
): CorsOriginCallback {
  return (origin, callback) => {
    if (isOriginAllowed(origin, allowed)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  };
}

export const corsOptions = {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as string[],
  allowedHeaders: ["Content-Type", "Authorization"] as string[],
  credentials: true,
  optionsSuccessStatus: 200,
};
