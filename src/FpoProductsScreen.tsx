import React from 'react';
import { getServiceCachePayload } from './sqlite';

type FpoProduct = {
  id: string;
  name: string;
  fpo: string;
  district: string;
  price: number;
  inStock: boolean;
};

const FPO_PRODUCTS: FpoProduct[] = [
  { id: 'FP-101', name: 'Traditional Rice (5kg)', fpo: 'Cauvery Farmers FPO', district: 'Thanjavur', price: 410, inStock: true },
  { id: 'FP-102', name: 'Cold-Pressed Groundnut Oil (1L)', fpo: 'Erode Agro Collective', district: 'Erode', price: 265, inStock: true },
  { id: 'FP-103', name: 'Millet Combo Pack', fpo: 'Madurai Millet Producers', district: 'Madurai', price: 320, inStock: false },
];

export function FpoProductsScreen() {
  const [cachePayload, setCachePayload] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(15);
      setCachePayload(payload);
    };

    void load();
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2>FPO Products (#15)</h2>
      <p>Browse Farmer Producer Organization catalog with offline snapshots.</p>
      <p>
        Catalog cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Product</th>
            <th>FPO</th>
            <th>District</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {FPO_PRODUCTS.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.fpo}</td>
              <td>{product.district}</td>
              <td>₹{product.price}</td>
              <td>{product.inStock ? 'In Stock' : 'Out of Stock'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
