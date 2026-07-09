/**
 * OpenTelemetry bootstrap stub.
 * Set OTEL_EXPORTER_OTLP_ENDPOINT to wire a full SDK in production.
 */
export const initTracing = (): void => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.log("OpenTelemetry: disabled (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)");
    return;
  }
  console.log(`OpenTelemetry stub ready — exporter endpoint: ${endpoint}`);
  // Full @opentelemetry/sdk-node wiring can be added when a collector is available.
};

export const shutdownTracing = async (): Promise<void> => {
  /* no-op until SDK is connected */
};
