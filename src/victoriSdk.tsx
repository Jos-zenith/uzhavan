import { useOfflineAgriSdk, type OfflineAgriSdkProviderProps } from './sdk/provider';
import { TelemetryClient } from './sdk/telemetry';
import type { TelemetryPayload } from './sdk/types';

export { OfflineAgriSdkProvider as VictoriProvider } from './sdk/provider';

export type {
  TelemetryEvent,
  TelemetryConfig,
  TelemetryTransport,
  RoiMetric,
} from './sdk/types';

export { OfflineDatasetCache } from './sdk/offline';
export { RoiEngine } from './sdk/roi';

type LegacyTrackInput = {
  eventId: string;
  payload?: TelemetryPayload;
  serviceId?: number;
};

function normalizeTrackArgs(
  arg1: string | LegacyTrackInput,
  arg2?: TelemetryPayload,
  arg3?: number
): { eventId: string; payload: TelemetryPayload; serviceId?: number } {
  if (typeof arg1 === 'string') {
    return {
      eventId: arg1,
      payload: arg2 ?? {},
      serviceId: arg3,
    };
  }

  return {
    eventId: arg1.eventId,
    payload: arg1.payload ?? {},
    serviceId: arg1.serviceId,
  };
}

export function useVictori() {
  const sdk = useOfflineAgriSdk();

  return {
    ...sdk,
    track: (
      arg1: string | LegacyTrackInput,
      arg2?: TelemetryPayload,
      arg3?: number
    ) => {
      const normalized = normalizeTrackArgs(arg1, arg2, arg3);
      sdk.track(normalized.eventId, normalized.payload, normalized.serviceId);
    },
  };
}

const telemetryClientSingleton = new TelemetryClient();
telemetryClientSingleton.startAutoFlush();

export const victoriSdk = {
  track: (
    arg1: string | LegacyTrackInput,
    arg2?: TelemetryPayload,
    arg3?: number
  ) => {
    const normalized = normalizeTrackArgs(arg1, arg2, arg3);
    telemetryClientSingleton.track(
      normalized.eventId,
      normalized.payload,
      normalized.serviceId
    );
  },
  flush: async () => {
    await telemetryClientSingleton.flush();
  },
  queueSize: () => telemetryClientSingleton.queueSize(),
  isOnline: () => telemetryClientSingleton.isOnline(),
};

export type { OfflineAgriSdkProviderProps };
export { TelemetryClient };
