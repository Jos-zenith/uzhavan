import React from 'react';
import { getServiceCachePayload } from './sqlite';

type OfficerContact = {
  name: string;
  designation: string;
  district: string;
  block: string;
  phone: string;
  visitDay: string;
};

const OFFICER_CONTACTS: OfficerContact[] = [
  {
    name: 'K. Ravi',
    designation: 'Assistant Agricultural Officer',
    district: 'Thanjavur',
    block: 'Orathanadu',
    phone: '+91 94422 10001',
    visitDay: 'Monday',
  },
  {
    name: 'S. Malathi',
    designation: 'Horticulture Officer',
    district: 'Madurai',
    block: 'Melur',
    phone: '+91 94422 10002',
    visitDay: 'Wednesday',
  },
  {
    name: 'R. Karthikeyan',
    designation: 'Soil Testing Officer',
    district: 'Erode',
    block: 'Gobichettipalayam',
    phone: '+91 94422 10003',
    visitDay: 'Friday',
  },
];

export function OfficerContactInfoScreen() {
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(9);
      setCachePayload(payload);
    };

    void load();
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2>Officer Contact Info (#9)</h2>
      <p>District/block officer directory with scheduled field visit days.</p>
      <p>
        Cached profile: <strong>{cachePayload ? 'Available' : 'Unavailable'}</strong>
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Designation</th>
            <th>District / Block</th>
            <th>Phone</th>
            <th>Visit Day</th>
          </tr>
        </thead>
        <tbody>
          {OFFICER_CONTACTS.map((officer) => (
            <tr key={`${officer.name}-${officer.block}`}>
              <td>{officer.name}</td>
              <td>{officer.designation}</td>
              <td>
                {officer.district} / {officer.block}
              </td>
              <td>{officer.phone}</td>
              <td>{officer.visitDay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
