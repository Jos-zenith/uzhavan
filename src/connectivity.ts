export type SyncLabel = 'Queued Locally' | 'Syncing' | 'Synced Successfully';

export type ConnectivityState = {
  isOnline: boolean;
  label: SyncLabel;
  lastUpdatedAt: number;
};

type Subscriber = (state: ConnectivityState) => void;

let pendingQueueCount = 0;

const listeners = new Set<Subscriber>();

let state: ConnectivityState = {
  isOnline: navigator.onLine,
  label: navigator.onLine ? 'Synced Successfully' : 'Queued Locally',
  lastUpdatedAt: Date.now(),
};

function emit(nextState: ConnectivityState): void {
  state = nextState;
  listeners.forEach((listener) => listener(state));
}

function setLabelFromState(): void {
  if (!state.isOnline || pendingQueueCount > 0) {
    emit({
      isOnline: state.isOnline,
      label: 'Queued Locally',
      lastUpdatedAt: Date.now(),
    });
    return;
  }

  emit({
    isOnline: state.isOnline,
    label: 'Synced Successfully',
    lastUpdatedAt: Date.now(),
  });
}

function onOnline(): void {
  emit({
    isOnline: true,
    label: pendingQueueCount > 0 ? 'Syncing' : 'Synced Successfully',
    lastUpdatedAt: Date.now(),
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
    lastUpdatedAt: Date.now(),
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
    lastUpdatedAt: Date.now(),
  });
}

export function markSynced(): void {
  pendingQueueCount = 0;
  setLabelFromState();
}

export function subscribeConnectivity(subscriber: Subscriber): () => void {
  listeners.add(subscriber);
  subscriber(state);

  return () => {
    listeners.delete(subscriber);
  };
}