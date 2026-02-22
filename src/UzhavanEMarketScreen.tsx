import React from 'react';
import { queueLocalChange } from './connectivity';
import { getServiceCachePayload } from './sqlite';

type MarketListing = {
  crop: string;
  quantityKg: string;
  expectedPricePerKg: string;
  contactNumber: string;
};

const EMPTY_LISTING: MarketListing = {
  crop: '',
  quantityKg: '',
  expectedPricePerKg: '',
  contactNumber: '',
};

export function UzhavanEMarketScreen() {
  const [listing, setListing] = React.useState<MarketListing>(EMPTY_LISTING);
  const [status, setStatus] = React.useState('');
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(18);
      setCachePayload(payload);
    };

    void load();
  }, []);

  const update = (key: keyof MarketListing) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setListing((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const saveDraft = () => {
    if (!listing.crop.trim() || !listing.quantityKg.trim() || !listing.expectedPricePerKg.trim()) {
      setStatus('Enter crop, quantity and expected price before saving.');
      return;
    }

    queueLocalChange();

    setListing(EMPTY_LISTING);
    setStatus('Listing draft saved offline. It will post when connectivity is restored.');
  };

  return (
    <section style={{ padding: 16 }}>
      <h2>Uzhavan e-Market (#18)</h2>
      <p>Create produce listings and queue them for online posting.</p>
      <p>
        Buyer directory cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>

      <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <label>
          Crop / Produce
          <input value={listing.crop} onChange={update('crop')} />
        </label>
        <label>
          Quantity (kg)
          <input value={listing.quantityKg} onChange={update('quantityKg')} />
        </label>
        <label>
          Expected Price per kg (₹)
          <input value={listing.expectedPricePerKg} onChange={update('expectedPricePerKg')} />
        </label>
        <label>
          Contact Number
          <input value={listing.contactNumber} onChange={update('contactNumber')} />
        </label>

        <button onClick={saveDraft}>Save Listing Draft</button>
        {status ? <p>{status}</p> : null}
      </div>
    </section>
  );
}
