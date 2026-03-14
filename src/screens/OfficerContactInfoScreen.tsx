import React from 'react';
import { getServiceCachePayload } from '../sqlite';
import { getService9Dataset, type Service9Dataset } from '../serviceDataLoader';

export function OfficerContactInfoScreen() {
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);
  const [officers, setOfficers] = React.useState<Service9Dataset['officerVisitDetails']>([]);

  React.useEffect(() => {
    const load = async () => {
      const [payload, dataset] = await Promise.all([
        getServiceCachePayload(9),
        getService9Dataset(),
      ]);

      setCachePayload(payload);
      setOfficers(dataset.officerVisitDetails);
    };

    void load();
  }, []);

  return (
    <section className="service-screen">
      <h2>Officer Contact Info (#9)</h2>
      <p>District/block officer directory with scheduled field visit days.</p>
      <p>
        Cached profile: <strong>{cachePayload ? 'Available' : 'Unavailable'}</strong>
      </p>
      <table>
        <thead>
          <tr>
            <th>Designation</th>
            <th>Level</th>
            <th>Visit Details</th>
            <th>Support Scope</th>
          </tr>
        </thead>
        <tbody>
          {officers.map((officer) => (
            <tr key={officer.officerId}>
              <td>{officer.designation}</td>
              <td>{officer.level}</td>
              <td>{officer.visitDetails}</td>
              <td>{officer.contactScope}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
