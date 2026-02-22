import React from 'react';
import { queueLocalChange } from './connectivity';
import { getServiceCachePayload } from './sqlite';

type TrainingSession = {
  id: string;
  topic: string;
  district: string;
  date: string;
  seatsLeft: number;
};

const SESSIONS: TrainingSession[] = [
  { id: 'ATMA-001', topic: 'Drip Irrigation Practices', district: 'Salem', date: '2026-03-05', seatsLeft: 18 },
  { id: 'ATMA-002', topic: 'Paddy Yield Optimization', district: 'Thanjavur', date: '2026-03-10', seatsLeft: 6 },
  { id: 'ATMA-003', topic: 'Integrated Pest Management', district: 'Dindigul', date: '2026-03-14', seatsLeft: 11 },
];

export function AtmaTrainingRegistrationScreen() {
  const [selectedSession, setSelectedSession] = React.useState(SESSIONS[0].id);
  const [farmerName, setFarmerName] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(17);
      setCachePayload(payload);
    };

    void load();
  }, []);

  const queueRegistration = () => {
    const trimmedName = farmerName.trim();
    if (!trimmedName) {
      setStatus('Enter farmer name before queuing registration.');
      return;
    }

    queueLocalChange();

    setFarmerName('');
    setStatus('Registration draft queued locally for sync.');
  };

  return (
    <section style={{ padding: 16 }}>
      <h2>ATMA Training Registration (#17)</h2>
      <p>Register for upcoming trainings and queue drafts offline.</p>
      <p>
        Calendar cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>

      <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <label>
          Training Session
          <select value={selectedSession} onChange={(event) => setSelectedSession(event.target.value)}>
            {SESSIONS.map((session) => (
              <option key={session.id} value={session.id}>
                {session.topic} · {session.district} · {session.date} · Seats left: {session.seatsLeft}
              </option>
            ))}
          </select>
        </label>

        <label>
          Farmer Name
          <input value={farmerName} onChange={(event) => setFarmerName(event.target.value)} />
        </label>

        <button onClick={queueRegistration}>Queue Registration</button>
        {status ? <p>{status}</p> : null}
      </div>
    </section>
  );
}
