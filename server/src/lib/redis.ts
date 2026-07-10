import {
  createClient,
  RedisClientOptions,
} from "redis";

export type RedisClient = ReturnType<typeof createClient>;

const UPSTASH_HOST_SUFFIX = ".upstash.io";
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 3;

/** Redact password from a Redis URL for safe logging. */
export const redactRedisUrl = (url: string): string => {
  try {
    const parsed = new URL(url.trim());
    if (parsed.password) parsed.password = "****";
    return parsed.toString();
  } catch {
    return "(invalid REDIS_URL)";
  }
};

/** Upstash requires TLS — upgrade redis:// to rediss:// for Upstash hosts. */
export const normalizeRedisUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname.endsWith(UPSTASH_HOST_SUFFIX) &&
      parsed.protocol === "redis:"
    ) {
      parsed.protocol = "rediss:";
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

/** Build node-redis v4 client options for local Redis or Upstash (TLS). */
export const buildRedisClientOptions = (url: string): RedisClientOptions => {
  const normalizedUrl = normalizeRedisUrl(url);
  let parsed: URL;

  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return { url: normalizedUrl };
  }

  const useTls = parsed.protocol === "rediss:";
  const isUpstash = parsed.hostname.endsWith(UPSTASH_HOST_SUFFIX);

  const reconnectStrategy = (retries: number) => {
    if (retries > MAX_RECONNECT_ATTEMPTS) return false;
    return Math.min(retries * 200, 2_000);
  };

  if (useTls) {
    return {
      url: normalizedUrl,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        reconnectStrategy,
        tls: true as const,
        rejectUnauthorized: false,
        ...(isUpstash ? { family: 4 as const } : {}),
      },
    };
  }

  return {
    url: normalizedUrl,
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      reconnectStrategy,
    },
  };
};

const connectClient = (client: RedisClient, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.off("error", onError);
      fn();
    };

    const onError = (err: Error) => {
      finish(() => reject(err));
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error(`connect timed out after ${timeoutMs}ms`))
      );
    }, timeoutMs);

    client.once("error", onError);
    client.connect().then(
      () => finish(() => resolve()),
      (err: Error) => finish(() => reject(err))
    );
  });

const safeQuit = async (client: RedisClient | null) => {
  if (!client) return;
  try {
    if (client.isOpen) await client.quit();
  } catch {
    /* already closed */
  }
};

export type RedisPubSubPair = {
  pub: RedisClient;
  sub: RedisClient;
};

/**
 * Connect pub/sub clients for the Socket.io Redis adapter.
 * Returns null on failure so callers can fall back to single-node mode.
 */
export const connectRedisPubSub = async (
  url: string
): Promise<RedisPubSubPair | null> => {
  const options = buildRedisClientOptions(url);
  const pub = createClient(options);
  const sub = pub.duplicate();

  try {
    await Promise.all([
      connectClient(pub, CONNECT_TIMEOUT_MS),
      connectClient(sub, CONNECT_TIMEOUT_MS),
    ]);

    let runtimeErrorLogged = false;
    const logRuntimeErrorOnce = (err: unknown) => {
      if (runtimeErrorLogged) return;
      runtimeErrorLogged = true;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Redis runtime error (${redactRedisUrl(url)}): ${message}. ` +
          "Further Redis errors suppressed."
      );
    };
    pub.on("error", logRuntimeErrorOnce);
    sub.on("error", logRuntimeErrorOnce);

    return { pub, sub };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `Redis connect failed (${redactRedisUrl(url)}): ${message}. ` +
        "Falling back to single-node Socket.io."
    );
    await Promise.all([safeQuit(pub), safeQuit(sub)]);
    return null;
  }
};

export const disconnectRedisClients = async (
  pub: RedisClient | null,
  sub: RedisClient | null
) => {
  await safeQuit(sub);
  await safeQuit(pub);
};
