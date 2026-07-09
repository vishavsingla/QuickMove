import { initTracing, isTracingEnabled } from "../../src/observability/tracing";

describe("tracing", () => {
  const original = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = original;
    }
  });

  it("stays disabled without OTEL_EXPORTER_OTLP_ENDPOINT", () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(() => initTracing()).not.toThrow();
    expect(isTracingEnabled()).toBe(false);
  });
});
