import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | null = null;

const traceUrl = (endpoint: string) =>
  endpoint.includes("/v1/traces") ? endpoint : `${endpoint.replace(/\/$/, "")}/v1/traces`;

export const initTracing = (): void => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.log("OpenTelemetry: disabled (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)");
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || "quickmove-api";

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({ url: traceUrl(endpoint) }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`OpenTelemetry SDK started — service=${serviceName} exporter=${endpoint}`);
};

export const shutdownTracing = async (): Promise<void> => {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
};

export const isTracingEnabled = (): boolean => sdk !== null;
