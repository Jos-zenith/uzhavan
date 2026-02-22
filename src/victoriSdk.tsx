import { useOfflineAgriSdk, type OfflineAgriSdkProviderProps } from './sdk/provider';
import { TelemetryClient } from './sdk/telemetry';
import type { TelemetryPayload, BusinessPolicyId } from './sdk/types';

export { OfflineAgriSdkProvider as VictoriProvider } from './sdk/provider';

export type {
  TelemetryEvent,
  TelemetryConfig,
  TelemetryTransport,
  RoiMetric,
  BusinessPolicyId,
} from './sdk/types';

export { OfflineDatasetCache } from './sdk/offline';
export { RoiEngine } from './sdk/roi';
export { BUSINESS_POLICIES, PolicyRegistryClient } from './sdk/policy';

/**
 * New policy-first track interface
 */
type PolicyFirstTrackInput = {
  policyId: BusinessPolicyId;
  eventId: string;
  payload?: TelemetryPayload;
  serviceId?: number;
};

/**
 * Legacy track interface (deprecated - will enforce policies with warnings)
 */
type LegacyTrackInput = {
  eventId: string;
  payload?: TelemetryPayload;
  serviceId?: number;
};

function normalizeTrackArgs(
  arg1: string | LegacyTrackInput | PolicyFirstTrackInput,
  arg2?: TelemetryPayload,
  arg3?: number
): { policyId: BusinessPolicyId; eventId: string; payload: TelemetryPayload; serviceId?: number } {
  // New policy-first API
  if (
    typeof arg1 === 'object' &&
    'policyId' in arg1
  ) {
    return {
      policyId: arg1.policyId,
      eventId: arg1.eventId,
      payload: arg1.payload ?? {},
      serviceId: arg1.serviceId,
    };
  }

  // Legacy API (string or legacy object)
  if (typeof arg1 === 'string') {
    throw new Error(
      '[POLICY ENFORCEMENT] Legacy track(eventId, payload) API removed. Use track({ policyId, eventId, payload })'
    );
  }

  throw new Error(
    '[POLICY ENFORCEMENT] Legacy track(eventId, payload) API removed. Use track({ policyId, eventId, payload })'
  );
}

export function useVictori() {
  const sdk = useOfflineAgriSdk();

  return {
    ...sdk,
    track: (
      arg1: string | LegacyTrackInput | PolicyFirstTrackInput,
      arg2?: TelemetryPayload,
      arg3?: number
    ) => {
      const normalized = normalizeTrackArgs(arg1, arg2, arg3);
      sdk.track(normalized.policyId, normalized.eventId, normalized.payload, normalized.serviceId);
    },
  };
}

const telemetryClientSingleton = new TelemetryClient();
telemetryClientSingleton.startAutoFlush();

export const victoriSdk = {
  /**
   * Policy-enforced track: requires policyId → eventId → payload validation
   */
  track: (
    arg1: string | LegacyTrackInput | PolicyFirstTrackInput,
    arg2?: TelemetryPayload,
    arg3?: number
  ) => {
    const normalized = normalizeTrackArgs(arg1, arg2, arg3);
    telemetryClientSingleton.track(
      normalized.policyId,
      normalized.eventId,
      normalized.payload,
      normalized.serviceId
    );
  },
  getPolicies: () => {
    return telemetryClientSingleton.getPolicyRegistry().listPolicies();
  },
  flush: async () => {
    await telemetryClientSingleton.flush();
  },
  queueSize: () => telemetryClientSingleton.queueSize(),
  isOnline: () => telemetryClientSingleton.isOnline(),
};

export type { OfflineAgriSdkProviderProps };
export { TelemetryClient };
