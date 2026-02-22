import React from 'react';
import {
  getSyncStatusSnapshot,
  triggerManualSync,
  type SyncStatusSnapshot,
} from './sqlite';
import './styles/syncStatus.css';

const EMPTY_SNAPSHOT: SyncStatusSnapshot = {
  connectivity: {
    isOnline: false,
    label: 'Queued Locally',
    networkType: 'Offline',
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: null,
  },
  queueCounts: {
    queued: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  },
  lastSuccessfulSyncAt: null,
  actions: [],
};

function formatTime(value: string | number | null | undefined): string {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString();
}

export default function SyncStatusScreen() {
  const [snapshot, setSnapshot] = React.useState<SyncStatusSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const loadSnapshot = React.useCallback(async () => {
    const next = await getSyncStatusSnapshot();
    setSnapshot(next);
  }, []);

  React.useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const handleManualSync = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await triggerManualSync();
      setSnapshot(next);
      setMessage('Manual sync executed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
      window.setTimeout(() => setMessage(''), 3000);
    }
  }, []);

  const isOnline = snapshot.connectivity.isOnline;

  return (
    <div className="sync-root">
      <header className="sync-header">
        <h2>Sync Status</h2>
        <p>
          Connectivity: <strong>{snapshot.connectivity.label}</strong> · Network:{' '}
          <strong>{snapshot.connectivity.networkType}</strong>
        </p>
        <p>Last successful sync: {formatTime(snapshot.lastSuccessfulSyncAt)}</p>
        <div className="sync-actions">
          <button onClick={() => void loadSnapshot()} disabled={loading}>
            Refresh Status
          </button>
          <button onClick={() => void handleManualSync()} disabled={loading || !isOnline}>
            {loading ? 'Syncing...' : 'Manual Sync'}
          </button>
        </div>
        {!isOnline && <small>Device is offline. Manual sync is disabled.</small>}
        {message ? <div className="sync-feedback">{message}</div> : null}
      </header>

      <section className="sync-grid">
        <article className="sync-card">
          <h3>Queued Locally</h3>
          <p>{snapshot.queueCounts.queued}</p>
        </article>
        <article className="sync-card">
          <h3>Syncing</h3>
          <p>{snapshot.queueCounts.syncing}</p>
        </article>
        <article className="sync-card">
          <h3>Synced</h3>
          <p>{snapshot.queueCounts.synced}</p>
        </article>
        <article className="sync-card">
          <h3>Failed</h3>
          <p>{snapshot.queueCounts.failed}</p>
        </article>
      </section>

      <section className="sync-table-wrap">
        <h3>Per-Action Sync Status</h3>
        <table className="sync-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Service</th>
              <th>Action</th>
              <th>Status</th>
              <th>Queued At</th>
              <th>Processed At</th>
              <th>Retries</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.actions.length ? (
              snapshot.actions.map((action) => (
                <tr key={action.id}>
                  <td>{action.id}</td>
                  <td>{action.serviceId}</td>
                  <td>{action.operationType}</td>
                  <td>{action.statusLabel}</td>
                  <td>{formatTime(action.queuedAt)}</td>
                  <td>{formatTime(action.processedAt)}</td>
                  <td>{action.retryCount}</td>
                  <td>{action.errorMessage || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No sync actions available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
