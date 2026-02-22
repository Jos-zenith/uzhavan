export type SyncLabel =
  | 'Queued Locally'
  | 'Syncing'
  | 'Synced Successfully'
  | 'Failed';

export type NetworkType = 'Wi-Fi' | 'Mobile Data' | 'Unknown' | 'Offline';

export type ConnectivityState = {
  isOnline: boolean;
  label: SyncLabel;
  networkType: NetworkType;
  lastUpdatedAt: number;
  lastSuccessfulSyncAt: number | null;
};

type Subscriber = (state: ConnectivityState) => void;

let pendingQueueCount = 0;

const listeners = new Set<Subscriber>();

let state: ConnectivityState = {
  isOnline: navigator.onLine,
  label: navigator.onLine ? 'Synced Successfully' : 'Queued Locally',
  networkType: navigator.onLine ? detectNetworkType() : 'Offline',
  lastUpdatedAt: Date.now(),
  lastSuccessfulSyncAt: null,
};

function detectNetworkType(): NetworkType {
  if (!navigator.onLine) {
    return 'Offline';
  }

  const connection = (
    navigator as Navigator & {
      connection?: { type?: string; effectiveType?: string };
      mozConnection?: { type?: string; effectiveType?: string };
      webkitConnection?: { type?: string; effectiveType?: string };
    }
  ).connection;

  const connType = connection?.type?.toLowerCase() ?? '';
  const effectiveType = connection?.effectiveType?.toLowerCase() ?? '';

  if (connType.includes('wifi') || connType.includes('ethernet')) {
    return 'Wi-Fi';
  }

  if (
    connType.includes('cellular') ||
    effectiveType.includes('2g') ||
    effectiveType.includes('3g') ||
    effectiveType.includes('4g') ||
    effectiveType.includes('5g')
  ) {
    return 'Mobile Data';
  }

  return 'Unknown';
}

function emit(nextState: ConnectivityState): void {
  state = nextState;
  listeners.forEach((listener) => listener(state));
}

function setLabelFromState(): void {
  if (!state.isOnline || pendingQueueCount > 0) {
    emit({
      isOnline: state.isOnline,
      label: 'Queued Locally',
      networkType: state.isOnline ? detectNetworkType() : 'Offline',
      lastUpdatedAt: Date.now(),
      lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
    });
    return;
  }

  emit({
    isOnline: state.isOnline,
    label: 'Synced Successfully',
    networkType: state.isOnline ? detectNetworkType() : 'Offline',
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
  });
}

function onOnline(): void {
  emit({
    isOnline: true,
    label: pendingQueueCount > 0 ? 'Syncing' : 'Synced Successfully',
    networkType: detectNetworkType(),
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
  });

  if (pendingQueueCount > 0) {
    window.setTimeout(() => {
      pendingQueueCount = 0;
      setLabelFromState();
    }, 1000);
  }
}

function onOffline(): void {
  emit({
    isOnline: false,
    label: 'Queued Locally',
    networkType: 'Offline',
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
  });
}

window.addEventListener('online', onOnline);
window.addEventListener('offline', onOffline);

export function getConnectivityState(): ConnectivityState {
  return state;
}

export function queueLocalChange(): void {
  pendingQueueCount += 1;
  setLabelFromState();
}

export function markSyncing(): void {
  if (!state.isOnline) {
    return;
  }

  emit({
    isOnline: true,
    label: 'Syncing',
    networkType: detectNetworkType(),
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
  });
}

export function markSynced(): void {
  pendingQueueCount = 0;
  const now = Date.now();
  state = {
    ...state,
    lastSuccessfulSyncAt: now,
  };
  setLabelFromState();
}

export function markSyncFailed(): void {
  emit({
    isOnline: state.isOnline,
    label: 'Failed',
    networkType: state.isOnline ? detectNetworkType() : 'Offline',
    lastUpdatedAt: Date.now(),
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
  });
}

export function subscribeConnectivity(subscriber: Subscriber): () => void {
  listeners.add(subscriber);
  subscriber(state);

  return () => {
    listeners.delete(subscriber);
  };
}