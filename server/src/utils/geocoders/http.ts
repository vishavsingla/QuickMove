import https from "https";
import tls from "tls";
import fs from "fs";
import { execSync } from "child_process";
import axios, { type AxiosInstance } from "axios";

const USER_AGENT = "QuickMove/1.0 (logistics; contact@quickmove.dev)";

/** Build a CA bundle Node trusts on macOS/corporate networks (Zscaler, etc.). */
const buildCaBundle = (): Array<string | Buffer> => {
  const ca: Array<string | Buffer> = [...tls.rootCertificates];

  const systemPem = "/etc/ssl/cert.pem";
  if (fs.existsSync(systemPem)) {
    ca.push(fs.readFileSync(systemPem, "utf8"));
  }

  const extra = process.env.NODE_EXTRA_CA_CERTS;
  if (extra && fs.existsSync(extra)) {
    ca.push(fs.readFileSync(extra, "utf8"));
  }

  // macOS system keychain — fixes "unable to get local issuer certificate" behind
  // corporate TLS inspection when NODE_EXTRA_CA_CERTS is not configured.
  if (process.platform === "darwin") {
    try {
      ca.push(
        execSync(
          "security find-certificate -a -p /Library/Keychains/System.keychain",
          { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
        )
      );
    } catch {
      /* keychain unavailable in minimal CI images */
    }
  }

  return ca;
};

const httpsAgent = new https.Agent({
  ca: buildCaBundle(),
  keepAlive: true,
  maxSockets: 8,
});

/** Shared axios instance with a TLS-aware agent for all geocoding providers. */
export const geoHttp: AxiosInstance = axios.create({
  httpsAgent,
  timeout: 7000,
  headers: { "User-Agent": USER_AGENT },
});
