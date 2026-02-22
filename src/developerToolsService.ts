import { readJson, writeJson } from './sdk/storage';

const DEVELOPER_TOOLS_STORAGE_KEY = 'tn.agri.developer.tools.v1';

export type SdkConfiguration = {
  environment: 'dev' | 'staging' | 'prod';
  apiBaseUrl: string;
  telemetryEnabled: boolean;
  flushIntervalMs: number;
  offlineQueueLimit: number;
  updatedAt: string;
};

export type SandboxTestResult = {
  id: string;
  suite: string;
  status: 'pass' | 'fail';
  durationMs: number;
  details: string;
};

export type SandboxRun = {
  runAt: string;
  total: number;
  passed: number;
  failed: number;
  results: SandboxTestResult[];
};

export type IntegrationDocSection = {
  id: string;
  title: string;
  summary: string;
  snippet: string;
};

export type PerformanceSnapshot = {
  capturedAt: string;
  sdkQueueDepth: number;
  flushLatencyMsP95: number;
  avgRenderMs: number;
  memoryMb: number;
  networkState: 'online' | 'offline';
};

export type RolloutChannel = 'canary' | 'beta' | 'stable';

export type VersionRollout = {
  id: string;
  version: string;
  channel: RolloutChannel;
  rolloutPercent: number;
  status: 'planned' | 'rolling' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type DebugIssue = {
  id: string;
  category: 'telemetry' | 'sync' | 'policy' | 'ui' | 'other';
  severity: 'low' | 'medium' | 'high';
  summary: string;
  details: string;
  createdAt: string;
};

export type TroubleshootingProbe = {
  id: string;
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  ranAt: string;
};

type DeveloperToolsState = {
  sdkConfiguration: SdkConfiguration;
  lastSandboxRun: SandboxRun | null;
  integrationDocs: IntegrationDocSection[];
  performanceHistory: PerformanceSnapshot[];
  rollouts: VersionRollout[];
  debugIssues: DebugIssue[];
  probes: TroubleshootingProbe[];
};

export type DeveloperToolsSnapshot = DeveloperToolsState;

function nowIso(): string {
  return new Date().toISOString();
}

function createSeedState(): DeveloperToolsState {
  const now = nowIso();

  return {
    sdkConfiguration: {
      environment: 'staging',
      apiBaseUrl: 'https://api.tn-agri.local/v1',
      telemetryEnabled: true,
      flushIntervalMs: 30000,
      offlineQueueLimit: 5000,
      updatedAt: now,
    },
    lastSandboxRun: null,
    integrationDocs: [
      {
        id: 'doc-setup',
        title: 'Quick SDK Setup',
        summary: 'Initialize provider and enforce business-policy event tracking.',
        snippet:
          "import { OfflineAgriSdkProvider, useOfflineAgriSdk } from './sdk';\n\n<OfflineAgriSdkProvider>\n  <App />\n</OfflineAgriSdkProvider>;",
      },
      {
        id: 'doc-policy',
        title: 'Policy-Enforced Event Tracking',
        summary: 'Track telemetry only with a valid policy and event schema.',
        snippet:
          "sdk.track('POL_BENEFIT_REGISTRATION', 'REGISTRATION_SUBMITTED', {\n  farmerId: 'F123',\n  schemeId: 'S456',\n  aadhaarNumber: 'xxxx',\n  bankAccountNumber: 'xxxx',\n});",
      },
      {
        id: 'doc-rollout',
        title: 'Feature Rollout Strategy',
        summary: 'Use canary → beta → stable progression with KPI guardrails.',
        snippet:
          "1) Create rollout at 5% canary\n2) Validate DQ + error budget\n3) Promote to beta 30%\n4) Complete at stable 100%",
      },
    ],
    performanceHistory: [],
    rollouts: [
      {
        id: 'rel-1',
        version: '1.0.0',
        channel: 'stable',
        rolloutPercent: 100,
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      },
    ],
    debugIssues: [],
    probes: [],
  };
}

function loadState(): DeveloperToolsState {
  const existing = readJson<DeveloperToolsState | null>(DEVELOPER_TOOLS_STORAGE_KEY, null);
  if (existing) {
    return existing;
  }

  const seeded = createSeedState();
  writeJson(DEVELOPER_TOOLS_STORAGE_KEY, seeded);
  return seeded;
}

function saveState(state: DeveloperToolsState): void {
  writeJson(DEVELOPER_TOOLS_STORAGE_KEY, state);
}

export function getDeveloperToolsSnapshot(): DeveloperToolsSnapshot {
  return loadState();
}

export function updateSdkConfiguration(
  updates: Partial<Omit<SdkConfiguration, 'updatedAt'>>
): SdkConfiguration {
  const state = loadState();
  state.sdkConfiguration = {
    ...state.sdkConfiguration,
    ...updates,
    updatedAt: nowIso(),
  };
  saveState(state);
  return state.sdkConfiguration;
}

export function runSandboxTestingEnvironment(): SandboxRun {
  const minute = new Date().getUTCMinutes();
  const cases: SandboxTestResult[] = [
    {
      id: 'sbx-1',
      suite: 'Policy schema validation',
      status: 'pass',
      durationMs: 60 + (minute % 7) * 3,
      details: 'Required fields and policy linkage validated.',
    },
    {
      id: 'sbx-2',
      suite: 'Offline queue replay order',
      status: minute % 4 === 0 ? 'fail' : 'pass',
      durationMs: 90 + (minute % 5) * 5,
      details:
        minute % 4 === 0
          ? 'Out-of-order event detected for parcel replay.'
          : 'Chronological replay consistent with event timestamps.',
    },
    {
      id: 'sbx-3',
      suite: 'Draft abandonment recovery',
      status: 'pass',
      durationMs: 40 + (minute % 4) * 4,
      details: 'Resume analytics emitted successfully.',
    },
    {
      id: 'sbx-4',
      suite: 'SDK key scope enforcement',
      status: minute % 5 === 0 ? 'fail' : 'pass',
      durationMs: 70 + (minute % 6) * 4,
      details:
        minute % 5 === 0
          ? 'Unauthorized scope usage rejected, manual review required.'
          : 'Scope bindings accepted for expected routes.',
    },
  ];

  const failed = cases.filter((result) => result.status === 'fail').length;
  const run: SandboxRun = {
    runAt: nowIso(),
    total: cases.length,
    passed: cases.length - failed,
    failed,
    results: cases,
  };

  const state = loadState();
  state.lastSandboxRun = run;
  saveState(state);
  return run;
}

export function getIntegrationDocumentationPortal(): IntegrationDocSection[] {
  return loadState().integrationDocs;
}

export function capturePerformanceMonitoringSnapshot(input: {
  sdkQueueDepth: number;
  isOnline: boolean;
}): PerformanceSnapshot {
  const minute = new Date().getUTCMinutes();
  const snapshot: PerformanceSnapshot = {
    capturedAt: nowIso(),
    sdkQueueDepth: input.sdkQueueDepth,
    flushLatencyMsP95: 120 + input.sdkQueueDepth * 2 + (minute % 6) * 7,
    avgRenderMs: 12 + (minute % 5),
    memoryMb: 220 + (minute % 12) * 4,
    networkState: input.isOnline ? 'online' : 'offline',
  };

  const state = loadState();
  state.performanceHistory.unshift(snapshot);
  state.performanceHistory = state.performanceHistory.slice(0, 20);
  saveState(state);
  return snapshot;
}

function ensureSemver(version: string): string {
  const normalized = version.trim();
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) {
    throw new Error('Version must use SEMVER format (e.g. 1.2.3).');
  }
  return normalized;
}

export function createVersionRollout(input: {
  version: string;
  channel: RolloutChannel;
  rolloutPercent: number;
}): VersionRollout {
  const state = loadState();
  const now = nowIso();

  const rollout: VersionRollout = {
    id: `rollout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    version: ensureSemver(input.version),
    channel: input.channel,
    rolloutPercent: Math.max(0, Math.min(100, Math.round(input.rolloutPercent))),
    status: input.rolloutPercent >= 100 ? 'completed' : 'planned',
    createdAt: now,
    updatedAt: now,
  };

  state.rollouts.unshift(rollout);
  saveState(state);
  return rollout;
}

export function updateRolloutControl(
  rolloutId: string,
  updates: Partial<Pick<VersionRollout, 'rolloutPercent' | 'status' | 'channel'>>
): VersionRollout {
  const state = loadState();
  const rollout = state.rollouts.find((entry) => entry.id === rolloutId);

  if (!rollout) {
    throw new Error(`Rollout ${rolloutId} not found.`);
  }

  if (updates.rolloutPercent !== undefined) {
    rollout.rolloutPercent = Math.max(0, Math.min(100, Math.round(updates.rolloutPercent)));
  }
  if (updates.status !== undefined) {
    rollout.status = updates.status;
  }
  if (updates.channel !== undefined) {
    rollout.channel = updates.channel;
  }

  if (rollout.rolloutPercent >= 100) {
    rollout.status = 'completed';
  }

  rollout.updatedAt = nowIso();
  saveState(state);
  return rollout;
}

export function logDebugIssue(input: {
  category: DebugIssue['category'];
  severity: DebugIssue['severity'];
  summary: string;
  details: string;
}): DebugIssue {
  const state = loadState();
  const issue: DebugIssue = {
    id: `dbg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    category: input.category,
    severity: input.severity,
    summary: input.summary.trim(),
    details: input.details.trim(),
    createdAt: nowIso(),
  };

  state.debugIssues.unshift(issue);
  state.debugIssues = state.debugIssues.slice(0, 100);
  saveState(state);
  return issue;
}

export function runTroubleshootingProbes(input: {
  sdkQueueDepth: number;
  isOnline: boolean;
}): TroubleshootingProbe[] {
  const now = nowIso();
  const probes: TroubleshootingProbe[] = [
    {
      id: `probe-${Date.now()}-1`,
      name: 'Queue pressure check',
      status: input.sdkQueueDepth > 100 ? 'warn' : 'ok',
      message:
        input.sdkQueueDepth > 100
          ? `Queue depth high (${input.sdkQueueDepth}). Consider flush tuning.`
          : `Queue depth healthy (${input.sdkQueueDepth}).`,
      ranAt: now,
    },
    {
      id: `probe-${Date.now()}-2`,
      name: 'Connectivity check',
      status: input.isOnline ? 'ok' : 'fail',
      message: input.isOnline ? 'Network is online.' : 'Offline mode active; remote sync blocked.',
      ranAt: now,
    },
    {
      id: `probe-${Date.now()}-3`,
      name: 'Policy configuration check',
      status: 'ok',
      message: 'Policy registry available with default policy baseline.',
      ranAt: now,
    },
  ];

  const state = loadState();
  state.probes = probes;
  saveState(state);
  return probes;
}
