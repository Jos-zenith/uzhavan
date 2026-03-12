import React from 'react';
import { useOfflineAgriSdk } from '../sdk/provider';
import {
  type BusinessPolicyId,
} from '../sdk/policy';
import {
  ensureStandardPolicyEvents,
  getOrCreateTelemetryAnonUserId,
  getOrCreateTelemetrySessionId,
} from '../sdk/serviceTelemetryCatalog';

type ServiceTelemetryConfig = {
  featureId: string;
  serviceId: number;
  policyId: BusinessPolicyId;
  source?: string;
  baseContext?: Record<string, string | number | boolean>;
  autoTrackOpened?: boolean;
};

type LoadMeta<T> = {
  operation: string;
  context?: Record<string, string | number | boolean>;
  successPayload?: Record<string, string | number | boolean> | ((result: T) => Record<string, string | number | boolean>);
};

function inferRecordsCount(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length;
  }

  if (!result || typeof result !== 'object') {
    return 1;
  }

  const candidate = result as Record<string, unknown>;
  const knownCollections = ['prices', 'forecast', 'trends', 'advisories', 'items', 'records'];

  for (const key of knownCollections) {
    const value = candidate[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 1;
}

function errorCodeFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 120);
  }
  return 'unknown_error';
}

export function useServiceTelemetry(config: ServiceTelemetryConfig) {
  const sdk = useOfflineAgriSdk();

  const sessionId = React.useMemo(() => getOrCreateTelemetrySessionId(), []);
  const userId = React.useMemo(() => getOrCreateTelemetryAnonUserId(), []);

  React.useEffect(() => {
    ensureStandardPolicyEvents(config.policyId);
  }, [config.policyId]);

  const track = React.useCallback(
    (eventId: string, payload?: Record<string, string | number | boolean>) => {
      if (!sdk.ready) {
        return;
      }

      sdk.track(
        config.policyId,
        eventId,
        {
          featureId: config.featureId,
          sessionId,
          userId,
          timestamp: new Date().toISOString(),
          source: config.source || 'web',
          ...(config.baseContext || {}),
          ...(payload || {}),
        },
        config.serviceId
      );
    },
    [config.baseContext, config.featureId, config.policyId, config.serviceId, config.source, sdk, sessionId, userId]
  );

  React.useEffect(() => {
    if (config.autoTrackOpened === false) {
      return;
    }

    try {
      track('service_opened', { screen: config.featureId });
    } catch (error) {
      console.warn('[useServiceTelemetry] service_opened failed', error);
    }
  }, [config.autoTrackOpened, config.featureId, track]);

  const trackDataLoad = React.useCallback(
    async <T,>(loader: () => Promise<T>, meta: LoadMeta<T>): Promise<T> => {
      const started = performance.now();
      track('service_data_load_started', {
        operation: meta.operation,
        ...(meta.context || {}),
      });

      try {
        const result = await loader();
        const latencyMs = Math.round(performance.now() - started);
        const successPayload =
          typeof meta.successPayload === 'function'
            ? meta.successPayload(result)
            : meta.successPayload || {};

        track('service_data_load_succeeded', {
          operation: meta.operation,
          latencyMs,
          records: inferRecordsCount(result),
          ...(meta.context || {}),
          ...successPayload,
        });

        return result;
      } catch (error) {
        const latencyMs = Math.round(performance.now() - started);

        track('service_data_load_failed', {
          operation: meta.operation,
          latencyMs,
          errorCode: errorCodeFromUnknown(error),
          ...(meta.context || {}),
        });

        throw error;
      }
    },
    [track]
  );

  const trackActionCompleted = React.useCallback(
    (actionName: string, payload?: Record<string, string | number | boolean>) => {
      track('service_action_completed', {
        actionName,
        ...(payload || {}),
      });
    },
    [track]
  );

  return {
    track,
    trackDataLoad,
    trackActionCompleted,
  };
}
