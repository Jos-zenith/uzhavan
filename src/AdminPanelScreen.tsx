import React from 'react';
import './styles/adminPanel.css';
import {
  RBAC_ROLES,
  createAdminUser,
  createBusinessPolicy,
  createSdkAccessKey,
  deleteBusinessPolicy,
  getDistrictImpactSnapshot,
  getAdminDashboardSnapshot,
  getComplianceSummary,
  revokeSdkAccessKey,
  rotateSdkAccessKey,
  runDataQualityChecks,
  setUserStatus,
  updateBusinessPolicy,
  updateUserRole,
  type ComplianceSummary,
  type DistrictImpactSnapshot,
  type ManagedBusinessPolicy,
  type RbacRole,
} from './adminService';
import { detectThreeSigmaAnomalies, type TimeSeriesPoint } from './roiEngine';

type PolicyForm = {
  id: string;
  name: string;
  purpose: string;
  owner: string;
  semver: string;
};

const EMPTY_POLICY_FORM: PolicyForm = {
  id: '',
  name: '',
  purpose: '',
  owner: '',
  semver: '1.0.0',
};

export default function AdminPanelScreen() {
  const [snapshot, setSnapshot] = React.useState(() => getAdminDashboardSnapshot());
  const [compliance, setCompliance] = React.useState<ComplianceSummary>(() =>
    getComplianceSummary()
  );
  const [policyForm, setPolicyForm] = React.useState<PolicyForm>(EMPTY_POLICY_FORM);
  const [policyEditor, setPolicyEditor] = React.useState<{
    id: string;
    purpose: string;
    owner: string;
  }>({ id: '', purpose: '', owner: '' });
  const [districts, setDistricts] = React.useState<DistrictImpactSnapshot[]>(() =>
    getDistrictImpactSnapshot()
  );
  const [sdkForm, setSdkForm] = React.useState({
    label: '',
    scopes: 'read:policy,write:telemetry',
    role: 'SECURITY_ADMIN' as RbacRole,
  });
  const [generatedSdkKey, setGeneratedSdkKey] = React.useState('');
  const [userForm, setUserForm] = React.useState({
    name: '',
    email: '',
    role: 'SUPPORT_AGENT' as RbacRole,
  });
  const [feedback, setFeedback] = React.useState('');

  const refresh = React.useCallback(() => {
    setSnapshot(getAdminDashboardSnapshot());
    setCompliance(getComplianceSummary());
    setDistricts(getDistrictImpactSnapshot());
  }, []);

  const districtSeries: TimeSeriesPoint[] = districts.map((district) => ({
    label: district.district,
    value: district.ingestionLagSeconds,
  }));
  const districtAnomalies = detectThreeSigmaAnomalies(districtSeries);

  const setMessage = React.useCallback((message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  }, []);

  const handleCreatePolicy = (event: React.FormEvent) => {
    event.preventDefault();

    try {
      createBusinessPolicy({
        id: policyForm.id,
        name: policyForm.name,
        purpose: policyForm.purpose,
        owner: policyForm.owner,
        semver: policyForm.semver,
      });
      setPolicyForm(EMPTY_POLICY_FORM);
      refresh();
      setMessage('Policy created with semantic version tracking.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handlePolicyBump = (policy: ManagedBusinessPolicy, bump: 'major' | 'minor' | 'patch') => {
    try {
      updateBusinessPolicy(
        policy.id,
        {},
        {
          bump,
          note: `Manual ${bump} version bump`,
        }
      );
      refresh();
      setMessage(`Policy ${policy.id} bumped (${bump}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handlePolicySave = (event: React.FormEvent) => {
    event.preventDefault();

    if (!policyEditor.id) {
      setMessage('Select a policy to edit.');
      return;
    }

    try {
      updateBusinessPolicy(policyEditor.id, {
        purpose: policyEditor.purpose,
        owner: policyEditor.owner,
      });
      refresh();
      setMessage(`Policy ${policyEditor.id} metadata updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateSdkKey = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const result = await createSdkAccessKey({
        label: sdkForm.label,
        scopes: sdkForm.scopes.split(',').map((value) => value.trim()),
        roleBindings: [sdkForm.role],
      });
      setGeneratedSdkKey(result.plainTextKey);
      setSdkForm({
        label: '',
        scopes: 'read:policy,write:telemetry',
        role: 'SECURITY_ADMIN',
      });
      refresh();
      setMessage('SDK key created. Copy plaintext key now; it is not stored in plain form.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRotateKey = async (id: string) => {
    try {
      const plainText = await rotateSdkAccessKey(id);
      setGeneratedSdkKey(plainText);
      refresh();
      setMessage(`SDK key ${id} rotated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateUser = (event: React.FormEvent) => {
    event.preventDefault();

    try {
      createAdminUser({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
      });
      setUserForm({ name: '', email: '', role: 'SUPPORT_AGENT' });
      refresh();
      setMessage('Admin user created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="admin-panel-root">
      <header className="admin-header">
        <h2>Admin Control Plane</h2>
        <p>
          Coverage: Policy Management, SDK Access, TimescaleDB Monitoring, Data Quality,
          RBAC (9 roles), System Health, Audit & Compliance.
        </p>
        {feedback && <div className="admin-feedback">{feedback}</div>}
      </header>

      <section className="admin-card">
        <h3>Business Policy Management (CRUD + SEMVER)</h3>
        <form className="admin-form-grid" onSubmit={handleCreatePolicy}>
          <input
            placeholder="Policy ID (e.g. POL_DATA_RETENTION)"
            value={policyForm.id}
            onChange={(event) => setPolicyForm((prev) => ({ ...prev, id: event.target.value }))}
          />
          <input
            placeholder="Policy Name"
            value={policyForm.name}
            onChange={(event) => setPolicyForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            placeholder="SEMVER (e.g. 1.0.0)"
            value={policyForm.semver}
            onChange={(event) => setPolicyForm((prev) => ({ ...prev, semver: event.target.value }))}
          />
          <input
            placeholder="Owner"
            value={policyForm.owner}
            onChange={(event) => setPolicyForm((prev) => ({ ...prev, owner: event.target.value }))}
          />
          <input
            className="wide"
            placeholder="Purpose"
            value={policyForm.purpose}
            onChange={(event) => setPolicyForm((prev) => ({ ...prev, purpose: event.target.value }))}
          />
          <button type="submit">Create Policy</button>
        </form>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Version</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.policies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.id}</td>
                  <td>{policy.semver}</td>
                  <td>{policy.status}</td>
                  <td>{policy.owner}</td>
                  <td className="actions">
                    <button onClick={() => handlePolicyBump(policy, 'patch')}>Patch</button>
                    <button onClick={() => handlePolicyBump(policy, 'minor')}>Minor</button>
                    <button onClick={() => handlePolicyBump(policy, 'major')}>Major</button>
                    <button
                      onClick={() => {
                        setPolicyEditor({
                          id: policy.id,
                          purpose: policy.purpose,
                          owner: policy.owner,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        try {
                          deleteBusinessPolicy(policy.id);
                          refresh();
                          setMessage(`Policy ${policy.id} deleted.`);
                        } catch (error) {
                          setMessage(error instanceof Error ? error.message : String(error));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="admin-form-grid" onSubmit={handlePolicySave}>
          <input value={policyEditor.id} disabled placeholder="Policy ID" />
          <input
            placeholder="Owner"
            value={policyEditor.owner}
            onChange={(event) =>
              setPolicyEditor((prev) => ({
                ...prev,
                owner: event.target.value,
              }))
            }
          />
          <input
            className="wide"
            placeholder="Purpose"
            value={policyEditor.purpose}
            onChange={(event) =>
              setPolicyEditor((prev) => ({
                ...prev,
                purpose: event.target.value,
              }))
            }
          />
          <button type="submit">Save Metadata</button>
        </form>
      </section>

      <section className="admin-grid-two">
        <article className="admin-card">
          <h3>SDK Key & Access Control</h3>
          <form className="admin-form-grid" onSubmit={handleCreateSdkKey}>
            <input
              placeholder="Key Label"
              value={sdkForm.label}
              onChange={(event) => setSdkForm((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              placeholder="Scopes (comma separated)"
              value={sdkForm.scopes}
              onChange={(event) => setSdkForm((prev) => ({ ...prev, scopes: event.target.value }))}
            />
            <select
              value={sdkForm.role}
              onChange={(event) =>
                setSdkForm((prev) => ({ ...prev, role: event.target.value as RbacRole }))
              }
            >
              {RBAC_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit">Create SDK Key</button>
          </form>
          {generatedSdkKey && (
            <p className="admin-inline-note">Generated key: {generatedSdkKey}</p>
          )}
          <div className="admin-list">
            {snapshot.sdkKeys.map((key) => (
              <div className="admin-list-item" key={key.id}>
                <div>
                  <strong>{key.label || key.id}</strong>
                  <p>
                    Prefix: {key.keyPrefix} · Status: {key.status}
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => void handleRotateKey(key.id)}>Rotate</button>
                  <button
                    onClick={() => {
                      revokeSdkAccessKey(key.id);
                      refresh();
                      setMessage(`SDK key ${key.id} revoked.`);
                    }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h3>TimescaleDB Infrastructure Monitoring</h3>
          <ul className="metrics-list">
            <li>Write throughput/min: {snapshot.timescale.writeThroughputPerMin}</li>
            <li>Ingest lag (sec): {snapshot.timescale.ingestLagSeconds}</li>
            <li>Active DB connections: {snapshot.timescale.activeConnections}</li>
            <li>Compression ratio: {snapshot.timescale.chunkCompressionRatio}x</li>
            <li>Hypertables: {snapshot.timescale.hypertableCount}</li>
            <li>Chunks: {snapshot.timescale.chunkCount}</li>
          </ul>
          <p className="admin-inline-note">Captured at: {snapshot.timescale.capturedAt}</p>
        </article>
      </section>

      <section className="admin-grid-two">
        <article className="admin-card">
          <h3>District-Level Ingestion & Impact</h3>
          <div className="district-grid">
            {districts.map((district) => (
              <div key={district.district} className="district-card">
                <div className="district-header">
                  <strong>{district.district}</strong>
                  <span className={`district-status ${district.status}`}>{district.status}</span>
                </div>
                <p>Ingest lag: {district.ingestionLagSeconds}s</p>
                <p>Pending syncs: {district.pendingSyncCount}</p>
                <p>Impact score: {district.impactScore}</p>
              </div>
            ))}
          </div>
          <p className="admin-inline-note">
            District coverage across 32+ regions with ingestion monitoring and impact scoring.
          </p>
        </article>

        <article className="admin-card">
          <h3>Trust Layer (3σ Anomaly Flags)</h3>
          <p className="muted">
            Districts exceeding 3 standard deviations are flagged for manual AAO review.
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Ingest Lag (sec)</th>
                  <th>Z-Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {districtAnomalies.anomalies.length ? (
                  districtAnomalies.anomalies.map((anomaly) => (
                    <tr key={anomaly.label}>
                      <td>{anomaly.label}</td>
                      <td>{anomaly.value.toFixed(1)}</td>
                      <td>{anomaly.zScore.toFixed(2)}</td>
                      <td className="trust-flag">Flagged</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No districts above 3σ threshold currently.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="admin-grid-two">
        <article className="admin-card">
          <h3>Data Quality Enforcement Dashboard</h3>
          <button
            onClick={() => {
              runDataQualityChecks();
              refresh();
              setMessage('Data quality checks executed and audit logged.');
            }}
          >
            Run Enforcement Checks
          </button>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Dataset</th>
                  <th>Threshold</th>
                  <th>Pass Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.dataQualityRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.ruleName}</td>
                    <td>{rule.dataset}</td>
                    <td>{rule.thresholdPercent}%</td>
                    <td>{rule.passRatePercent}%</td>
                    <td>{rule.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-card">
          <h3>System Health & Uptime Monitoring</h3>
          <ul className="metrics-list">
            <li>Status: {snapshot.systemHealth.status}</li>
            <li>Uptime (30d): {snapshot.systemHealth.uptimePercent30d}%</li>
            <li>API P95 latency: {snapshot.systemHealth.apiP95LatencyMs} ms</li>
            <li>Error rate: {snapshot.systemHealth.errorRatePercent}%</li>
            <li>Queue backlog: {snapshot.systemHealth.queueBacklogCount}</li>
          </ul>
          <p className="admin-inline-note">Captured at: {snapshot.systemHealth.capturedAt}</p>
        </article>
      </section>

      <section className="admin-grid-two">
        <article className="admin-card">
          <h3>User & Role Management ({RBAC_ROLES.length} RBAC roles)</h3>
          <form className="admin-form-grid" onSubmit={handleCreateUser}>
            <input
              placeholder="Full name"
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              placeholder="Email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <select
              value={userForm.role}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, role: event.target.value as RbacRole }))
              }
            >
              {RBAC_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit">Add User</button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      <div className="muted">{user.email}</div>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(event) => {
                          updateUserRole(user.id, event.target.value as RbacRole);
                          refresh();
                        }}
                      >
                        {RBAC_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{user.status}</td>
                    <td className="actions">
                      <button
                        onClick={() => {
                          setUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active');
                          refresh();
                        }}
                      >
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-card">
          <h3>Audit Logs & Compliance Tracking</h3>
          <ul className="metrics-list">
            <li>
              Compliance controls: {compliance.controlsCovered}/{compliance.controlsTotal}
            </li>
            <li>Compliance score: {compliance.compliancePercent}%</li>
            <li>Open warnings: {compliance.openWarnings}</li>
            <li>Last audit event: {compliance.lastAuditAt ?? 'n/a'}</li>
          </ul>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id}>
                    <td>{log.loggedAt}</td>
                    <td>{log.actor}</td>
                    <td>{log.action}</td>
                    <td>{log.target}</td>
                    <td>{log.details}</td>
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
