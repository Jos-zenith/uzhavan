import React, { useState, useEffect } from 'react';
import type { LiveTelemetryEvent, OfflineQueueStatus } from '../types/roiConsole';
import '../styles/telemetryLiveView.css';

interface Props {
  onNavigateBack?: () => void;
}

export const TelemetryLiveViewScreen: React.FC<Props> = ({ onNavigateBack }) => {
  const [events, setEvents] = useState<LiveTelemetryEvent[]>([]);
  const [filterFeature, setFilterFeature] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const [queueStatus, setQueueStatus] = useState<OfflineQueueStatus>({
    queuedEventCount: 0,
    lastSyncTime: new Date().toISOString(),
    syncStatus: 'synced',
  });

  // Simulate live event stream
  useEffect(() => {
    const mockEvents: LiveTelemetryEvent[] = [
      {
        timestamp: new Date(Date.now() - 1000).toISOString(),
        userSessionHash: 'aa9f2b...',
        featureId: 'WEATHER_FORECAST',
        eventId: 'service_data_load_succeeded',
        latencyMs: 145,
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 2000).toISOString(),
        userSessionHash: 'bb3e4c...',
        featureId: 'MARKET_PRICE',
        eventId: 'service_data_load_succeeded',
        latencyMs: 287,
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 3500).toISOString(),
        userSessionHash: 'cc5d1a...',
        featureId: 'FERTILIZER_STOCK',
        eventId: 'service_data_load_failed',
        latencyMs: 5000,
        status: 'failure',
      },
      {
        timestamp: new Date(Date.now() - 5000).toISOString(),
        userSessionHash: 'aa9f2b...',
        featureId: 'WEATHER_FORECAST',
        eventId: 'service_action_completed',
        latencyMs: 89,
        status: 'success',
      },
      {
        timestamp: new Date(Date.now() - 7000).toISOString(),
        userSessionHash: 'dd7f9e...',
        featureId: 'SEED_STOCK',
        eventId: 'service_data_load_succeeded',
        latencyMs: 234,
        status: 'success',
      },
    ];

    setEvents(mockEvents);

    // Simulate periodic new events
    const interval = setInterval(() => {
      const newEvent: LiveTelemetryEvent = {
        timestamp: new Date().toISOString(),
        userSessionHash: `${Math.random().toString(36).substr(2, 9)}...`,
        featureId: ['WEATHER_FORECAST', 'MARKET_PRICE', 'FERTILIZER_STOCK', 'SEED_STOCK'][
          Math.floor(Math.random() * 4)
        ],
        eventId: Math.random() > 0.1 ? 'service_data_load_succeeded' : 'service_data_load_failed',
        latencyMs: Math.floor(Math.random() * 5000) + 50,
        status: Math.random() > 0.05 ? 'success' : 'failure',
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((event) => {
    if (filterFeature && event.featureId !== filterFeature) return false;
    if (filterEventType && event.eventId !== filterEventType) return false;
    if (showErrorsOnly && event.status !== 'failure') return false;
    return true;
  });

  const uniqueFeatures = Array.from(new Set(events.map((e) => e.featureId)));
  const uniqueEventTypes = Array.from(new Set(events.map((e) => e.eventId)));

  const handleFlushQueue = () => {
    setQueueStatus((prev) => ({
      ...prev,
      syncStatus: 'syncing',
    }));

    // Simulate flush
    setTimeout(() => {
      setQueueStatus((prev) => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString(),
        queuedEventCount: 0,
      }));
    }, 2000);
  };

  return (
    <div className="telemetry-live-view">
      {/* Header */}
      <div className="tlv-header">
        <button className="btn-back" onClick={onNavigateBack}>
          ← Back
        </button>
        <div className="tlv-title-section">
          <h1>📡 Telemetry Live View</h1>
          <p className="tlv-subtitle">Real-time event stream • Debug • Verify standardization</p>
        </div>
      </div>

      {/* Offline Queue Status */}
      <div className="queue-status-panel">
        <div className="queue-item">
          <span className="queue-label">Queue Status:</span>
          <span className={`queue-value ${queueStatus.syncStatus}`}>
            {queueStatus.syncStatus === 'synced' && '✅ Synced'}
            {queueStatus.syncStatus === 'syncing' && '⏳ Syncing...'}
            {queueStatus.syncStatus === 'queued' && '⚠️ Queued'}
          </span>
        </div>

        <div className="queue-item">
          <span className="queue-label">Queued Events:</span>
          <span className="queue-value">{queueStatus.queuedEventCount}</span>
        </div>

        <div className="queue-item">
          <span className="queue-label">Last Sync:</span>
          <span className="queue-value">
            {new Date(queueStatus.lastSyncTime).toLocaleTimeString()}
          </span>
        </div>

        <button
          className="btn-flush"
          onClick={handleFlushQueue}
          disabled={queueStatus.syncStatus === 'syncing'}
        >
          🔄 Flush Now
        </button>
      </div>

      {/* Filters */}
      <div className="tlv-filters">
        <div className="filter-group">
          <label htmlFor="filter-feature">Filter by Feature:</label>
          <select
            id="filter-feature"
            value={filterFeature}
            onChange={(e) => setFilterFeature(e.target.value)}
          >
            <option value="">All Features</option>
            {uniqueFeatures.map((feature) => (
              <option key={feature} value={feature}>
                {feature}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-event">Filter by Event Type:</label>
          <select
            id="filter-event"
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
          >
            <option value="">All Event Types</option>
            {uniqueEventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={showErrorsOnly}
              onChange={(e) => setShowErrorsOnly(e.target.checked)}
            />
            Errors only
          </label>
        </div>
      </div>

      {/* Event Table */}
      <div className="event-table-container">
        <div className="event-count">
          Showing {filteredEvents.length} of {events.length} events
        </div>

        <table className="event-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User/Session (hashed)</th>
              <th>Feature ID</th>
              <th>Event ID</th>
              <th>Latency (ms)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event, idx) => (
              <tr key={idx} className={`event-row status-${event.status}`}>
                <td className="timestamp-col">
                  <div className="timestamp">{new Date(event.timestamp).toLocaleTimeString()}</div>
                  <div className="timestamp-ms">{new Date(event.timestamp).getMilliseconds()}ms</div>
                </td>
                <td className="session-col">
                  <code className="session-hash">{event.userSessionHash}</code>
                </td>
                <td className="feature-col">
                  <span className="feature-badge">{event.featureId}</span>
                </td>
                <td className="event-col">
                  <span className="event-name">{event.eventId}</span>
                </td>
                <td className="latency-col">
                  <span className={`latency ${event.latencyMs > 1000 ? 'slow' : 'normal'}`}>
                    {event.latencyMs}ms
                  </span>
                </td>
                <td className="status-col">
                  <span className={`status-badge status-${event.status}`}>
                    {event.status === 'success' && '✅'}
                    {event.status === 'failure' && '❌'}
                    {event.status === 'timeout' && '⏱️'}
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEvents.length === 0 && (
          <div className="no-events">
            <p>No events match your filters.</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <strong>💡 About this view:</strong>
        <ul>
          <li>
            <strong>Live stream:</strong> Events appear in real-time as they arrive
          </li>
          <li>
            <strong>Debugging:</strong> Filter by feature, event type, or errors to diagnose issues
          </li>
          <li>
            <strong>Standardization proof:</strong> Consistent event IDs, fields, and formats confirm
            schema compliance
          </li>
          <li>
            <strong>Offline queue:</strong> Shows if events are queued locally and syncs to backend
          </li>
        </ul>
      </div>
    </div>
  );
};
