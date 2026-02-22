import React from 'react';
import { getServiceCachePayload } from './sqlite';

type OrganicContact = {
  type: 'Trader' | 'Certifier';
  name: string;
  district: string;
  phone: string;
};

const ORGANIC_CONTACTS: OrganicContact[] = [
  {
    type: 'Trader',
    name: 'Green Earth Organics',
    district: 'Coimbatore',
    phone: '+91 98400 22001',
  },
  {
    type: 'Trader',
    name: 'Delta Natural Produce',
    district: 'Thanjavur',
    phone: '+91 98400 22002',
  },
  {
    type: 'Certifier',
    name: 'Tamil Organic Certification Cell',
    district: 'Chennai',
    phone: '+91 98400 22003',
  },
];

export function OrganicFarmingInfoScreen() {
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(14);
      setCachePayload(payload);
    };

    void load();
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2>Organic Farming Info (#14)</h2>
      <p>Directory of traders and certification agencies for organic producers.</p>
      <p>
        Directory cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>

      <ul>
        {ORGANIC_CONTACTS.map((contact) => (
          <li key={`${contact.type}-${contact.name}`}>
            <strong>{contact.type}:</strong> {contact.name} ({contact.district}) · {contact.phone}
          </li>
        ))}
      </ul>
    </section>
  );
}
