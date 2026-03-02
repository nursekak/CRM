import { useState, useEffect } from 'react';
import { printedParts as api } from '../api';

export default function PrintedParts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    import('../api').then(({ products: pApi }) => pApi.list().then(setProducts).catch(() => []));
  }, []);

  useEffect(() => {
    const params = {};
    if (productId) params.product_id = productId;
    api.list(params).then(setList).catch(() => []).finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Отпечатанные детали</h1>
        <select value={productId} onChange={e => setProductId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          <option value="">Все изделия</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Изделие</th>
              <th>Деталь</th>
              <th>Версия</th>
              <th>Кол-во</th>
              <th>Принтер</th>
            </tr>
          </thead>
          <tbody>
            {list.map(pp => (
              <tr key={pp.id}>
                <td>{new Date(pp.printed_at).toLocaleString()}</td>
                <td>{pp.product_name}</td>
                <td>{pp.part_name}</td>
                <td>{pp.model_version}</td>
                <td>{pp.quantity}</td>
                <td>{pp.printer_code || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
