import React from 'react';
import { useOfflineAgriSdk } from '../sdk/provider';
import { setServiceDataTelemetryTracker } from '../serviceDataLoader';
import {
  TRACKED_SERVICE_DEFINITIONS,
  createTelemetrySpec,
  ensureStandardPolicyEvents,
  getOrCreateTelemetryAnonUserId,
  getOrCreateTelemetrySessionId,
  getTrackedServiceByDatasetPath,
} from '../sdk/serviceTelemetryCatalog';

const STANDARD_APPROVALS = {
  productApproved: true,
  engineeringApproved: true,
  analyticsApproved: true,
  approvedAt: new Date().toISOString(),
};

export function useTelemetryGovernance(): void {
  const sdk = useOfflineAgriSdk();
  const sessionId = React.useMemo(() => getOrCreateTelemetrySessionId(), []);
  const userId = React.useMemo(() => getOrCreateTelemetryAnonUserId(), []);

  React.useEffect(() => {
    TRACKED_SERVICE_DEFINITIONS.forEach((definition) => {
      ensureStandardPolicyEvents(definition.policyId);
      sdk.registerTelemetrySpec(createTelemetrySpec(definition));
      sdk.setFeatureApprovals(definition.featureId, STANDARD_APPROVALS);
    });
  }, [sdk]);

  React.useEffect(() => {
    if (!sdk.ready) {
      return;
    }

    setServiceDataTelemetryTracker({
      onLoadStarted: (datasetPath) => {
        const definition = getTrackedServiceByDatasetPath(datasetPath);
        if (!definition) {
          return;
        }

        sdk.track(
          definition.policyId,
          'service_data_load_started',
          {
            featureId: definition.featureId,
            sessionId,
            userId,
            timestamp: new Date().toISOString(),
            source: 'service_data_loader',
            operation: `fetch:${datasetPath}`,
            datasetPath,
          },
          definition.serviceId
        );
      },
      onLoadSucceeded: (datasetPath, latencyMs, records) => {
        const definition = getTrackedServiceByDatasetPath(datasetPath);
        if (!definition) {
          return;
        }

        sdk.track(
          definition.policyId,
          'service_data_load_succeeded',
          {
            featureId: definition.featureId,
            sessionId,
            userId,
            timestamp: new Date().toISOString(),
            source: 'service_data_loader',
            operation: `fetch:${datasetPath}`,
            datasetPath,
            latencyMs,
            records,
          },
          definition.serviceId
        );
      },
      onLoadFailed: (datasetPath, latencyMs, errorCode) => {
        const definition = getTrackedServiceByDatasetPath(datasetPath);
        if (!definition) {
          return;
        }

        sdk.track(
          definition.policyId,
          'service_data_load_failed',
          {
            featureId: definition.featureId,
            sessionId,
            userId,
            timestamp: new Date().toISOString(),
            source: 'service_data_loader',
            operation: `fetch:${datasetPath}`,
            datasetPath,
            latencyMs,
            errorCode,
          },
          definition.serviceId
        );
      },
    });

    return () => {
      setServiceDataTelemetryTracker(null);
    };
  }, [sdk, sessionId, userId]);
}