import React from 'react';
import './styles/developerTools.css';
import { useOfflineAgriSdk } from './sdk';
import {
  capturePerformanceMonitoringSnapshot,
  createVersionRollout,
  getDeveloperToolsSnapshot,
  getIntegrationDocumentationPortal,
  logDebugIssue,
  runSandboxTestingEnvironment,
  runTroubleshootingProbes,
  updateRolloutControl,
  updateSdkConfiguration,
  type RolloutChannel,
} from './developerToolsService';

type DebugForm = {
  category: 'telemetry' | 'sync' | 'policy' | 'ui' | 'other';
  severity: 'low' | 'medium' | 'high';
  summary: string;
  details: string;
};

const EMPTY_DEBUG_FORM: DebugForm = {
  category: 'other',
  severity: 'medium',
  summary: '',
  details: '',
};

const DEVELOPER_TOOLS_CAPABILITIES = [
  { id: 'sdk-config', label: 'SDK Configuration Portal', implemented: true },
  { id: 'sandbox', label: 'Sandbox Testing Environment', implemented: true },
  {
    id: 'integration-docs',
    label: 'Integration Documentation Portal',
    implemented: true,
  },
  {
    id: 'performance-dashboard',
    label: 'Performance Monitoring Dashboard',
    implemented: true,
  },
  {
    id: 'version-rollout',
    label: 'Version Management & Rollout Control',
    implemented: true,
  },
  {
    id: 'debug-troubleshooting',
    label: 'Debug & Troubleshooting Tools',
    implemented: true,
  },
] as const;

export default function DeveloperToolsScreen() {
  const sdk = useOfflineAgriSdk();
  const [snapshot, setSnapshot] = React.useState(() => getDeveloperToolsSnapshot());
  const [docs] = React.useState(() => getIntegrationDocumentationPortal());
  const [sdkForm, setSdkForm] = React.useState(() => ({
    environment: snapshot.sdkConfiguration.environment,
    apiBaseUrl: snapshot.sdkConfiguration.apiBaseUrl,
    telemetryEnabled: snapshot.sdkConfiguration.telemetryEnabled,
    flushIntervalMs: String(snapshot.sdkConfiguration.flushIntervalMs),
    offlineQueueLimit: String(snapshot.sdkConfiguration.offlineQueueLimit),
  }));
  const [rolloutForm, setRolloutForm] = React.useState({
    version: '',
    channel: 'canary' as RolloutChannel,
    rolloutPercent: '5',
  });
  const [debugForm, setDebugForm] = React.useState(EMPTY_DEBUG_FORM);
  const [message, setMessage] = React.useState('');

  const refresh = React.useCallback(() => {
    setSnapshot(getDeveloperToolsSnapshot());
  }, []);

  const notify = React.useCallback((value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 3000);
  }, []);

  const runPerformanceCapture = React.useCallback(() => {
    capturePerformanceMonitoringSnapshot({
      sdkQueueDepth: sdk.queueSize,
      isOnline: sdk.isOnline,
    });
    refresh();
  }, [refresh, sdk.isOnline, sdk.queueSize]);

  React.useEffect(() => {
    runPerformanceCapture();
  }, [runPerformanceCapture]);

  const latestPerf = snapshot.performanceHistory[0] ?? null;
  const completedCapabilities = DEVELOPER_TOOLS_CAPABILITIES.filter(
    (capability) => capability.implemented
  ).length;
  const completionPercent = Math.round(
    (completedCapabilities / DEVELOPER_TOOLS_CAPABILITIES.length) * 100
  );

  return (
    <div className="devtools-root">
      <header className="devtools-header">
        <h2>Developer Tools Portal</h2>
        <p>Developer Tools — {completionPercent}% Complete</p>
        <div className="devtools-capability-list" aria-label="Developer tools completion tracker">
          {DEVELOPER_TOOLS_CAPABILITIES.map((capability) => (
            <div key={capability.id} className="devtools-capability-item">
              <span className="devtools-capability-status" aria-hidden="true">
                {capability.implemented ? '✅' : '❌'}
              </span>
              <span>{capability.label}</span>
            </div>
          ))}
        </div>
        {message && <div className="devtools-feedback">{message}</div>}
      </header>

      <section className="devtools-card">
        <h3>SDK Configuration Portal</h3>
        <form
          className="devtools-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              updateSdkConfiguration({
                environment: sdkForm.environment,
                apiBaseUrl: sdkForm.apiBaseUrl,
                telemetryEnabled: sdkForm.telemetryEnabled,
                flushIntervalMs: Number(sdkForm.flushIntervalMs),
                offlineQueueLimit: Number(sdkForm.offlineQueueLimit),
              });
              refresh();
              notify('SDK configuration updated.');
            } catch (error) {
              notify(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          <select
            value={sdkForm.environment}
            onChange={(event) =>
              setSdkForm((prev) => ({
                ...prev,
                environment: event.target.value as 'dev' | 'staging' | 'prod',
              }))
            }
          >
            <option value="dev">dev</option>
            <option value="staging">staging</option>
            <option value="prod">prod</option>
          </select>
          <input
            value={sdkForm.apiBaseUrl}
            placeholder="API base URL"
            onChange={(event) => setSdkForm((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
          />
          <input
            value={sdkForm.flushIntervalMs}
            placeholder="Flush interval (ms)"
            onChange={(event) =>
              setSdkForm((prev) => ({ ...prev, flushIntervalMs: event.target.value }))
            }
          />
          <input
            value={sdkForm.offlineQueueLimit}
            placeholder="Queue limit"
            onChange={(event) =>
              setSdkForm((prev) => ({ ...prev, offlineQueueLimit: event.target.value }))
            }
          />
          <label className="devtools-checkbox">
            <input
              type="checkbox"
              checked={sdkForm.telemetryEnabled}
              onChange={(event) =>
                setSdkForm((prev) => ({
                  ...prev,
                  telemetryEnabled: event.target.checked,
                }))
              }
            />
            Telemetry enabled
          </label>
          <button type="submit">Save Configuration</button>
        </form>
      </section>

      <section className="devtools-grid-two">
        <article className="devtools-card">
          <h3>Sandbox Testing Environment</h3>
          <button
            onClick={() => {
              const run = runSandboxTestingEnvironment();
              refresh();
              notify(`Sandbox run complete: ${run.passed}/${run.total} passed.`);
            }}
          >
            Run Sandbox Tests
          </button>
          {snapshot.lastSandboxRun && (
            <>
              <p className="devtools-inline-note">
                Last run: {snapshot.lastSandboxRun.runAt} · Passed {snapshot.lastSandboxRun.passed}/
                {snapshot.lastSandboxRun.total}
              </p>
              <div className="devtools-table-wrap">
                <table className="devtools-table">
                  <thead>
                    <tr>
                      <th>Suite</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.lastSandboxRun.results.map((result) => (
                      <tr key={result.id}>
                        <td>{result.suite}</td>
                        <td>{result.status}</td>
                        <td>{result.durationMs} ms</td>
                        <td>{result.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <article className="devtools-card">
          <h3>Performance Monitoring Dashboard</h3>
          <div className="devtools-metrics-grid">
            <div>
              <span className="label">Queue depth</span>
              <strong>{latestPerf?.sdkQueueDepth ?? sdk.queueSize}</strong>
            </div>
            <div>
              <span className="label">Flush P95</span>
              <strong>{latestPerf?.flushLatencyMsP95 ?? 0} ms</strong>
            </div>
            <div>
              <span className="label">Render avg</span>
              <strong>{latestPerf?.avgRenderMs ?? 0} ms</strong>
            </div>
            <div>
              <span className="label">Memory</span>
              <strong>{latestPerf?.memoryMb ?? 0} MB</strong>
            </div>
            <div>
              <span className="label">Network</span>
              <strong>{latestPerf?.networkState ?? (sdk.isOnline ? 'online' : 'offline')}</strong>
            </div>
          </div>
          <button onClick={runPerformanceCapture}>Capture Metrics</button>
          {latestPerf && (
            <p className="devtools-inline-note">Captured at: {latestPerf.capturedAt}</p>
          )}
        </article>
      </section>

      <section className="devtools-card">
        <h3>Integration Documentation Portal</h3>
        <div className="devtools-docs-grid">
          {docs.map((doc) => (
            <article key={doc.id} className="devtools-doc-card">
              <h4>{doc.title}</h4>
              <p>{doc.summary}</p>
              <pre>{doc.snippet}</pre>
            </article>
          ))}
        </div>
      </section>

      <section className="devtools-grid-two">
        <article className="devtools-card">
          <h3>Version Management & Rollout Control</h3>
          <form
            className="devtools-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                createVersionRollout({
                  version: rolloutForm.version,
                  channel: rolloutForm.channel,
                  rolloutPercent: Number(rolloutForm.rolloutPercent),
                });
                setRolloutForm({ version: '', channel: 'canary', rolloutPercent: '5' });
                refresh();
                notify('Rollout created.');
              } catch (error) {
                notify(error instanceof Error ? error.message : String(error));
              }
            }}
          >
            <input
              placeholder="Version (SEMVER)"
              value={rolloutForm.version}
              onChange={(event) =>
                setRolloutForm((prev) => ({ ...prev, version: event.target.value }))
              }
            />
            <select
              value={rolloutForm.channel}
              onChange={(event) =>
                setRolloutForm((prev) => ({
                  ...prev,
                  channel: event.target.value as RolloutChannel,
                }))
              }
            >
              <option value="canary">canary</option>
              <option value="beta">beta</option>
              <option value="stable">stable</option>
            </select>
            <input
              placeholder="Rollout %"
              value={rolloutForm.rolloutPercent}
              onChange={(event) =>
                setRolloutForm((prev) => ({ ...prev, rolloutPercent: event.target.value }))
              }
            />
            <button type="submit">Create Rollout</button>
          </form>

          <div className="devtools-table-wrap">
            <table className="devtools-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Channel</th>
                  <th>Rollout</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rollouts.map((rollout) => (
                  <tr key={rollout.id}>
                    <td>{rollout.version}</td>
                    <td>{rollout.channel}</td>
                    <td>{rollout.rolloutPercent}%</td>
                    <td>{rollout.status}</td>
                    <td className="actions">
                      <button
                        onClick={() => {
                          updateRolloutControl(rollout.id, {
                            rolloutPercent: Math.min(100, rollout.rolloutPercent + 10),
                            status: 'rolling',
                          });
                          refresh();
                        }}
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => {
                          updateRolloutControl(rollout.id, { status: 'paused' });
                          refresh();
                        }}
                      >
                        Pause
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="devtools-card">
          <h3>Debug & Troubleshooting Tools</h3>
          <button
            onClick={() => {
              runTroubleshootingProbes({
                sdkQueueDepth: sdk.queueSize,
                isOnline: sdk.isOnline,
              });
              refresh();
              notify('Troubleshooting probes executed.');
            }}
          >
            Run Probes
          </button>

          <form
            className="devtools-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              logDebugIssue(debugForm);
              setDebugForm(EMPTY_DEBUG_FORM);
              refresh();
              notify('Debug issue logged.');
            }}
          >
            <select
              value={debugForm.category}
              onChange={(event) =>
                setDebugForm((prev) => ({
                  ...prev,
                  category: event.target.value as
                    | 'telemetry'
                    | 'sync'
                    | 'policy'
                    | 'ui'
                    | 'other',
                }))
              }
            >
              <option value="telemetry">telemetry</option>
              <option value="sync">sync</option>
              <option value="policy">policy</option>
              <option value="ui">ui</option>
              <option value="other">other</option>
            </select>
            <select
              value={debugForm.severity}
              onChange={(event) =>
                setDebugForm((prev) => ({
                  ...prev,
                  severity: event.target.value as 'low' | 'medium' | 'high',
                }))
              }
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <input
              placeholder="Issue summary"
              value={debugForm.summary}
              onChange={(event) =>
                setDebugForm((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
            <input
              className="wide"
              placeholder="Issue details"
              value={debugForm.details}
              onChange={(event) =>
                setDebugForm((prev) => ({ ...prev, details: event.target.value }))
              }
            />
            <button type="submit">Log Issue</button>
          </form>

          <div className="devtools-table-wrap">
            <table className="devtools-table">
              <thead>
                <tr>
                  <th>Probe</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.probes.map((probe) => (
                  <tr key={probe.id}>
                    <td>{probe.name}</td>
                    <td>{probe.status}</td>
                    <td>{probe.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="devtools-table-wrap">
            <table className="devtools-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.debugIssues.slice(0, 10).map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.createdAt}</td>
                    <td>{issue.category}</td>
                    <td>{issue.severity}</td>
                    <td>{issue.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
