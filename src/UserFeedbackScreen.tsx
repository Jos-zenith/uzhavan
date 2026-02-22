import React from 'react';
import { queueLocalChange } from './connectivity';
import { getServiceCachePayload } from './sqlite';

export function UserFeedbackScreen() {
  const [message, setMessage] = React.useState('');
  const [rating, setRating] = React.useState(4);
  const [status, setStatus] = React.useState('');
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(12);
      setCachePayload(payload);
    };

    void load();
  }, []);

  const submitFeedback = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setStatus('Please enter feedback before saving.');
      return;
    }

    queueLocalChange();

    setMessage('');
    setStatus('Feedback queued locally and will sync when online.');
  };

  return (
    <section style={{ padding: 16 }}>
      <h2>User Feedback (#12)</h2>
      <p>Offline-first feedback form with queued submission.</p>
      <p>
        Template cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>

      <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <label>
          Rating (1 to 5)
          <input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value) || 1)}
          />
        </label>

        <label>
          Feedback
          <textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share issue details or suggestions"
          />
        </label>

        <button onClick={submitFeedback}>Save Feedback Locally</button>
        {status ? <p>{status}</p> : null}
      </div>
    </section>
  );
}
