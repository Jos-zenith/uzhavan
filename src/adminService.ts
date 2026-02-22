import { readJson, writeJson } from './sdk/storage';
import { sha256Hex } from './security';

const ADMIN_STORAGE_KEY = 'tn.agri.admin.panel.v1';

export const RBAC_ROLES = [
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'POLICY_ADMIN',
  'SECURITY_ADMIN',
  'DATA_STEWARD',
  'OPS_ENGINEER',
  'AUDITOR',
  'SUPPORT_AGENT',
  'READ_ONLY_ANALYST',
] as const;

export type RbacRole = (typeof RBAC_ROLES)[number];

export type PolicySemverBump = 'major' | 'minor' | 'patch';

export type ManagedBusinessPolicy = {
  id: string;
  name: string;
  purpose: string;
  owner: string;
  status: 'active' | 'archived';
  semver: string;
  createdAt: string;
  updatedAt: string;
  versionHistory: Array<{
    semver: string;
    changedAt: string;
    note: string;
  }>;
};

export type SdkAccessKey = {
  id: string;
  label: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  roleBindings: RbacRole[];
  status: 'active' | 'revoked';
  createdAt: string;
  rotatedAt: string | null;
  lastUsedAt: string | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: RbacRole;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

export type TimescaleInfrastructureSnapshot = {
  capturedAt: string;
  writeThroughputPerMin: number;
  ingestLagSeconds: number;
  activeConnections: number;
  chunkCompressionRatio: number;
  hypertableCount: number;
  chunkCount: number;
};

export type DataQualityRule = {
  id: string;
  ruleName: string;
  dataset: string;
  thresholdPercent: number;
  passRatePercent: number;
  failedRows: number;
  status: 'pass' | 'warning' | 'fail';
  checkedAt: string;
};

export type SystemHealthSnapshot = {
  capturedAt: string;
  uptimePercent30d: number;
  apiP95LatencyMs: number;
  errorRatePercent: number;
  queueBacklogCount: number;
  status: 'healthy' | 'degraded';
};

export type AdminAuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  loggedAt: string;
};

export type DistrictImpactSnapshot = {
  district: string;
  ingestionLagSeconds: number;
  pendingSyncCount: number;
  impactScore: number;
  status: 'healthy' | 'watch' | 'critical';
};

type AdminState = {
  policies: ManagedBusinessPolicy[];
  sdkKeys: SdkAccessKey[];
  users: AdminUser[];
  dataQualityRules: DataQualityRule[];
  auditLogs: AdminAuditLog[];
};

export type AdminDashboardSnapshot = {
  policies: ManagedBusinessPolicy[];
  sdkKeys: SdkAccessKey[];
  users: AdminUser[];
  dataQualityRules: DataQualityRule[];
  auditLogs: AdminAuditLog[];
  timescale: TimescaleInfrastructureSnapshot;
  systemHealth: SystemHealthSnapshot;
};

export type ComplianceSummary = {
  controlsCovered: number;
  controlsTotal: number;
  compliancePercent: number;
  openWarnings: number;
  lastAuditAt: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function semverRegex(): RegExp {
  return /^\d+\.\d+\.\d+$/;
}

function ensureSemver(semver: string): string {
  const normalized = semver.trim();
  if (!semverRegex().test(normalized)) {
    throw new Error('SEMVER must be in format MAJOR.MINOR.PATCH (e.g. 1.2.0)');
  }
  return normalized;
}

function bumpSemver(current: string, bump: PolicySemverBump): string {
  const [major, minor, patch] = ensureSemver(current)
    .split('.')
    .map((value) => Number(value));

  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function buildKeyMaterial(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}.${Date.now().toString(36)}.${random}`;
}

function createSeedState(): AdminState {
  const createdAt = nowIso();

  return {
    policies: [
      {
        id: 'POL_BENEFIT_REGISTRATION',
        name: 'Benefit Registration Policy',
        purpose: 'Controls registration workflow events and duplicate constraints',
        owner: 'Policy Office',
        status: 'active',
        semver: '1.0.0',
        createdAt,
        updatedAt: createdAt,
        versionHistory: [{ semver: '1.0.0', changedAt: createdAt, note: 'Initial baseline' }],
      },
    ],
    sdkKeys: [],
    users: [
      {
        id: 'admin-1',
        name: 'System Administrator',
        email: 'admin@tn-agri.local',
        role: 'SUPER_ADMIN',
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'auditor-1',
        name: 'Compliance Auditor',
        email: 'audit@tn-agri.local',
        role: 'AUDITOR',
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    dataQualityRules: [
      {
        id: 'DQ-1',
        ruleName: 'Required farmerId completeness',
        dataset: 'benefit_registrations',
        thresholdPercent: 99,
        passRatePercent: 99.4,
        failedRows: 8,
        status: 'pass',
        checkedAt: createdAt,
      },
      {
        id: 'DQ-2',
        ruleName: 'Parcel uniqueness conflict ratio',
        dataset: 'land_parcels',
        thresholdPercent: 98,
        passRatePercent: 97.1,
        failedRows: 31,
        status: 'warning',
        checkedAt: createdAt,
      },
      {
        id: 'DQ-3',
        ruleName: 'Aadhaar checksum validity',
        dataset: 'subsidy_applications',
        thresholdPercent: 99,
        passRatePercent: 96.7,
        failedRows: 54,
        status: 'fail',
        checkedAt: createdAt,
      },
    ],
    auditLogs: [
      {
        id: `audit-${Date.now()}`,
        actor: 'system',
        action: 'ADMIN_PANEL_INITIALIZED',
        target: 'admin_state',
        details: 'Initial admin control plane created',
        loggedAt: createdAt,
      },
    ],
  };
}

function loadState(): AdminState {
  const state = readJson<AdminState | null>(ADMIN_STORAGE_KEY, null);
  if (state) {
    return state;
  }

  const seeded = createSeedState();
  writeJson(ADMIN_STORAGE_KEY, seeded);
  return seeded;
}

function saveState(state: AdminState): void {
  writeJson(ADMIN_STORAGE_KEY, state);
}

export function getDistrictImpactSnapshot(): DistrictImpactSnapshot[] {
  const state = loadState();
  const avgPassRate =
    state.dataQualityRules.reduce((sum, rule) => sum + rule.passRatePercent, 0) /
    Math.max(1, state.dataQualityRules.length);

  const baseImpact = Math.round(avgPassRate);
  const basePending = Math.max(1, state.sdkKeys.length);

  return [
    {
      district: 'Madurai',
      ingestionLagSeconds: 12,
      pendingSyncCount: basePending + 2,
      impactScore: baseImpact + 5,
      status: 'healthy',
    },
    {
      district: 'Thanjavur',
      ingestionLagSeconds: 18,
      pendingSyncCount: basePending + 3,
      impactScore: baseImpact + 1,
      status: 'watch',
    },
    {
      district: 'Erode',
      ingestionLagSeconds: 9,
      pendingSyncCount: basePending + 1,
      impactScore: baseImpact + 8,
      status: 'healthy',
    },
    {
      district: 'Coimbatore',
      ingestionLagSeconds: 26,
      pendingSyncCount: basePending + 5,
      impactScore: baseImpact - 6,
      status: 'watch',
    },
    {
      district: 'Tirunelveli',
      ingestionLagSeconds: 38,
      pendingSyncCount: basePending + 7,
      impactScore: baseImpact - 12,
      status: 'critical',
    },
  ];
}

function appendAudit(state: AdminState, actor: string, action: string, target: string, details: string) {
  state.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actor,
    action,
    target,
    details,
    loggedAt: nowIso(),
  });

  if (state.auditLogs.length > 300) {
    state.auditLogs = state.auditLogs.slice(0, 300);
  }
}

function deriveTimescaleSnapshot(): TimescaleInfrastructureSnapshot {
  const minute = new Date().getUTCMinutes();

  return {
    capturedAt: nowIso(),
    writeThroughputPerMin: 8000 + minute * 25,
    ingestLagSeconds: 3 + (minute % 5),
    activeConnections: 40 + (minute % 17),
    chunkCompressionRatio: Number((2.6 + (minute % 10) * 0.05).toFixed(2)),
    hypertableCount: 14,
    chunkCount: 486,
  };
}

function deriveSystemHealth(state: AdminState): SystemHealthSnapshot {
  const warnings = state.dataQualityRules.filter((rule) => rule.status !== 'pass').length;
  const backlog = Math.max(0, warnings * 12 - state.sdkKeys.filter((key) => key.status === 'active').length * 2);
  const errorRate = Number((0.1 + warnings * 0.07).toFixed(2));

  return {
    capturedAt: nowIso(),
    uptimePercent30d: Number((99.95 - warnings * 0.12).toFixed(2)),
    apiP95LatencyMs: 140 + warnings * 25,
    errorRatePercent: errorRate,
    queueBacklogCount: backlog,
    status: errorRate > 0.3 ? 'degraded' : 'healthy',
  };
}

export function getAdminDashboardSnapshot(): AdminDashboardSnapshot {
  const state = loadState();
  return {
    policies: state.policies,
    sdkKeys: state.sdkKeys,
    users: state.users,
    dataQualityRules: state.dataQualityRules,
    auditLogs: state.auditLogs,
    timescale: deriveTimescaleSnapshot(),
    systemHealth: deriveSystemHealth(state),
  };
}

export function createBusinessPolicy(input: {
  id: string;
  name: string;
  purpose: string;
  owner: string;
  semver: string;
  actor?: string;
}): ManagedBusinessPolicy {
  const state = loadState();
  const now = nowIso();
  const policyId = input.id.trim().toUpperCase();

  if (!policyId) {
    throw new Error('Policy ID is required');
  }

  if (state.policies.some((policy) => policy.id === policyId)) {
    throw new Error(`Policy ${policyId} already exists`);
  }

  const policy: ManagedBusinessPolicy = {
    id: policyId,
    name: input.name.trim(),
    purpose: input.purpose.trim(),
    owner: input.owner.trim(),
    status: 'active',
    semver: ensureSemver(input.semver),
    createdAt: now,
    updatedAt: now,
    versionHistory: [
      {
        semver: ensureSemver(input.semver),
        changedAt: now,
        note: 'Policy created',
      },
    ],
  };

  state.policies.unshift(policy);
  appendAudit(state, input.actor ?? 'admin@local', 'POLICY_CREATE', policyId, `Created version ${policy.semver}`);
  saveState(state);
  return policy;
}

export function updateBusinessPolicy(
  policyId: string,
  updates: { name?: string; purpose?: string; owner?: string; status?: 'active' | 'archived' },
  options?: { bump?: PolicySemverBump; note?: string; actor?: string }
): ManagedBusinessPolicy {
  const state = loadState();
  const existing = state.policies.find((policy) => policy.id === policyId);

  if (!existing) {
    throw new Error(`Policy ${policyId} was not found`);
  }

  const nextVersion = options?.bump ? bumpSemver(existing.semver, options.bump) : existing.semver;

  if (updates.name !== undefined) {
    existing.name = updates.name.trim();
  }
  if (updates.purpose !== undefined) {
    existing.purpose = updates.purpose.trim();
  }
  if (updates.owner !== undefined) {
    existing.owner = updates.owner.trim();
  }
  if (updates.status !== undefined) {
    existing.status = updates.status;
  }

  if (nextVersion !== existing.semver) {
    existing.semver = nextVersion;
    existing.versionHistory.unshift({
      semver: nextVersion,
      changedAt: nowIso(),
      note: options?.note?.trim() || `Version bump (${options?.bump})`,
    });
  }

  existing.updatedAt = nowIso();

  appendAudit(
    state,
    options?.actor ?? 'admin@local',
    'POLICY_UPDATE',
    existing.id,
    `Updated policy to ${existing.semver}`
  );
  saveState(state);
  return existing;
}

export function deleteBusinessPolicy(policyId: string, actor: string = 'admin@local'): void {
  const state = loadState();
  const before = state.policies.length;
  state.policies = state.policies.filter((policy) => policy.id !== policyId);

  if (state.policies.length === before) {
    throw new Error(`Policy ${policyId} was not found`);
  }

  appendAudit(state, actor, 'POLICY_DELETE', policyId, 'Policy removed from registry');
  saveState(state);
}

export async function createSdkAccessKey(input: {
  label: string;
  scopes: string[];
  roleBindings: RbacRole[];
  actor?: string;
}): Promise<{ created: SdkAccessKey; plainTextKey: string }> {
  const state = loadState();
  const id = `sdk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const rawKey = buildKeyMaterial('tnagri');
  const keyHash = await sha256Hex(rawKey);
  const now = nowIso();

  const created: SdkAccessKey = {
    id,
    label: input.label.trim(),
    keyPrefix: rawKey.slice(0, 12),
    keyHash,
    scopes: input.scopes.map((scope) => scope.trim()).filter(Boolean),
    roleBindings: input.roleBindings,
    status: 'active',
    createdAt: now,
    rotatedAt: null,
    lastUsedAt: null,
  };

  state.sdkKeys.unshift(created);
  appendAudit(state, input.actor ?? 'admin@local', 'SDK_KEY_CREATE', created.id, `Scopes=${created.scopes.join(',') || 'none'}`);
  saveState(state);
  return { created, plainTextKey: rawKey };
}

export async function rotateSdkAccessKey(id: string, actor: string = 'admin@local'): Promise<string> {
  const state = loadState();
  const key = state.sdkKeys.find((entry) => entry.id === id);

  if (!key) {
    throw new Error(`SDK key ${id} was not found`);
  }

  const rawKey = buildKeyMaterial('tnagri');
  key.keyHash = await sha256Hex(rawKey);
  key.keyPrefix = rawKey.slice(0, 12);
  key.rotatedAt = nowIso();
  key.status = 'active';

  appendAudit(state, actor, 'SDK_KEY_ROTATE', id, 'SDK key material rotated');
  saveState(state);
  return rawKey;
}

export function revokeSdkAccessKey(id: string, actor: string = 'admin@local'): void {
  const state = loadState();
  const key = state.sdkKeys.find((entry) => entry.id === id);

  if (!key) {
    throw new Error(`SDK key ${id} was not found`);
  }

  key.status = 'revoked';
  appendAudit(state, actor, 'SDK_KEY_REVOKE', id, 'Key revoked from access control');
  saveState(state);
}

export function createAdminUser(input: {
  name: string;
  email: string;
  role: RbacRole;
  actor?: string;
}): AdminUser {
  const state = loadState();
  const now = nowIso();

  const user: AdminUser = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  state.users.unshift(user);
  appendAudit(state, input.actor ?? 'admin@local', 'USER_CREATE', user.id, `Role=${user.role}`);
  saveState(state);
  return user;
}

export function updateUserRole(userId: string, role: RbacRole, actor: string = 'admin@local'): void {
  const state = loadState();
  const user = state.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error(`User ${userId} was not found`);
  }

  user.role = role;
  user.updatedAt = nowIso();
  appendAudit(state, actor, 'USER_ROLE_UPDATE', userId, `Role=${role}`);
  saveState(state);
}

export function setUserStatus(
  userId: string,
  status: 'active' | 'disabled',
  actor: string = 'admin@local'
): void {
  const state = loadState();
  const user = state.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error(`User ${userId} was not found`);
  }

  user.status = status;
  user.updatedAt = nowIso();
  appendAudit(state, actor, 'USER_STATUS_UPDATE', userId, `Status=${status}`);
  saveState(state);
}

export function runDataQualityChecks(actor: string = 'admin@local'): DataQualityRule[] {
  const state = loadState();
  const now = nowIso();

  state.dataQualityRules = state.dataQualityRules.map((rule, index) => {
    const variance = (new Date().getUTCMinutes() + index * 3) % 4;
    const passRatePercent = Number(Math.max(92, rule.passRatePercent - 0.2 + variance * 0.15).toFixed(2));

    const status: DataQualityRule['status'] =
      passRatePercent >= rule.thresholdPercent
        ? 'pass'
        : passRatePercent >= rule.thresholdPercent - 1
          ? 'warning'
          : 'fail';

    return {
      ...rule,
      passRatePercent,
      failedRows: Math.max(0, Math.round((100 - passRatePercent) * 3)),
      status,
      checkedAt: now,
    };
  });

  appendAudit(state, actor, 'DATA_QUALITY_RUN', 'data_quality_rules', 'Executed enforcement rule checks');
  saveState(state);
  return state.dataQualityRules;
}

export function getComplianceSummary(): ComplianceSummary {
  const state = loadState();
  const totalControls = 12;
  const activePolicies = state.policies.filter((policy) => policy.status === 'active').length;
  const activeKeys = state.sdkKeys.filter((key) => key.status === 'active').length;
  const activeUsers = state.users.filter((user) => user.status === 'active').length;
  const warnings = state.dataQualityRules.filter((rule) => rule.status !== 'pass').length;
  const controlsCovered = Math.min(totalControls, 4 + activePolicies + Number(activeKeys > 0) + Number(activeUsers > 1));

  const lastAuditAt = state.auditLogs.length ? state.auditLogs[0].loggedAt : null;

  return {
    controlsCovered,
    controlsTotal: totalControls,
    compliancePercent: Number(((controlsCovered / totalControls) * 100).toFixed(1)),
    openWarnings: warnings,
    lastAuditAt,
  };
}
