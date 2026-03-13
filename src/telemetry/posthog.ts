import posthog from 'posthog-js';

export type TelemetryEvent =
  | 'feature_opened'
  | 'market_price_checked'
  | 'machinery_booking_started'
  | 'machinery_booking_confirmed'
  | 'roi_snapshot_viewed';

let telemetryReady = false;

export function initTelemetry(): void {
  const key = (process.env.REACT_APP_POSTHOG_KEY || '').trim();
  const host = (process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com').trim();

  if (!key || typeof window === 'undefined') {
    telemetryReady = false;
    return;
  }

  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    autocapture: false,
  });

  telemetryReady = true;
}

export function trackTelemetry(
  event: TelemetryEvent,
  props: Record<string, unknown> = {}
): void {
  if (!telemetryReady) {
    return;
  }

  posthog.capture(event, {
    app: 'uzhavan',
    ...props,
  });
}
