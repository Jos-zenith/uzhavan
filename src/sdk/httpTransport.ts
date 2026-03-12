import type { TelemetryEvent, TelemetryTransport } from './types';

export type HttpTelemetryTransportOptions = {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10000;

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

export function createHttpTelemetryTransport(
  options: HttpTelemetryTransportOptions
): TelemetryTransport {
  const endpoint = normalizeEndpoint(options.endpoint);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!endpoint) {
    throw new Error('Telemetry endpoint is required');
  }

  return {
    async sendBatch(events: TelemetryEvent[]): Promise<void> {
      if (!events.length) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(options.apiKey ? { 'x-api-key': options.apiKey } : {}),
            ...(options.headers ?? {}),
          },
          body: JSON.stringify({ events }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Telemetry ingest failed with status ${response.status}`);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
  };
}
