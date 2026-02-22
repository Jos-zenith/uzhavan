import { OfflineEventQueue } from './queue';
import { PolicyRegistryClient } from './policy';
import type {
  TelemetryConfig,
  TelemetryEvent,
  TelemetryPayload,
  TelemetryTransport,
} from './types';
import type { BusinessPolicyId } from './policy';

const defaultTransport: TelemetryTransport = {
  async sendBatch(events: TelemetryEvent[]) {
    console.log('[SDK Telemetry] buffered batch', events.length);
  },
};

const DEFAULT_CONFIG: Required<TelemetryConfig> = {
  storageKey: 'tn.agri.sdk.telemetry.queue.v1',
  maxQueueSize: 5000,
  flushBatchSize: 100,
  flushIntervalMs: 30000,
  maxRetries: 5,
};

export class TelemetryClient {
  private readonly config: Required<TelemetryConfig>;
  private readonly queue: OfflineEventQueue;
  private readonly policyRegistry: PolicyRegistryClient;
  private transport: TelemetryTransport;
  private flushTimer: number | null = null;
  private online = true;

  constructor(config?: TelemetryConfig, transport?: TelemetryTransport) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.queue = new OfflineEventQueue(this.config.storageKey, this.config.maxQueueSize);
    this.policyRegistry = new PolicyRegistryClient();
    this.transport = transport ?? defaultTransport;

    if (typeof window !== 'undefined') {
      this.online = window.navigator.onLine;
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.online = true;
    void this.flush();
  };

  private handleOffline = () => {
    this.online = false;
  };

  setTransport(transport: TelemetryTransport): void {
    this.transport = transport;
  }

  isOnline(): boolean {
    return this.online;
  }

  queueSize(): number {
    return this.queue.snapshot().size;
  }

  /**
   * Access the policy registry to query or register policies
   */
  getPolicyRegistry(): PolicyRegistryClient {
    return this.policyRegistry;
  }

  /**
   * POLICY-ENFORCED: Track an event only if linked to a pre-defined Business Policy
   * 
   * @throws Error if policy is not registered or event is not valid for the policy
   * @throws Error if payload does not conform to event schema
   */
  track(
    policyId: BusinessPolicyId,
    eventId: string,
    payload: TelemetryPayload,
    serviceId?: number
  ): TelemetryEvent {
    // Validate that policy exists and event belongs to policy
    const validation = this.policyRegistry.validateEvent(policyId, eventId, payload ?? {});
    if (!validation.valid) {
      throw new Error(
        `[POLICY ENFORCEMENT] Cannot track event. ${validation.errors.join('; ')}`
      );
    }

    const event: TelemetryEvent = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      eventId,
      serviceId,
      occurredAt: new Date().toISOString(),
      payload,
      retries: 0,
      policyId, // Link event to its policy
    };

    this.queue.enqueue(event);
    return event;
  }

  /**
   * Track feature events (for feature release management, not policy-enforced)
   * Used by the governance & experimentation layer for feature telemetry
   */
  trackFeatureEvent(
    eventId: string,
    payload: TelemetryPayload,
    serviceId?: number
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      eventId,
      serviceId,
      occurredAt: new Date().toISOString(),
      payload,
      retries: 0,
      // Note: no policyId for feature events
    };

    this.queue.enqueue(event);
    return event;
  }

  startAutoFlush(): void {
    if (this.flushTimer !== null || typeof window === 'undefined') {
      return;
    }

    this.flushTimer = window.setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  stopAutoFlush(): void {
    if (this.flushTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flush(): Promise<void> {
    if (!this.online) {
      return;
    }

    const batch = this.queue.dequeueBatch(this.config.flushBatchSize);
    if (!batch.length) {
      return;
    }

    try {
      await this.transport.sendBatch(batch);
      this.queue.removeByIds(batch.map((item) => item.id));
    } catch (error) {
      console.warn('[SDK Telemetry] flush failed', error);
      this.queue.incrementRetries(batch.map((item) => item.id));
      this.queue.dropExceededRetries(this.config.maxRetries);
    }
  }

  clearQueue(): void {
    this.queue.clear();
  }

  getQueuedEvents(): TelemetryEvent[] {
    return this.queue.all();
  }

  destroy(): void {
    this.stopAutoFlush();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}
