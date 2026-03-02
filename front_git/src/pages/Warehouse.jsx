import { useState, useEffect } from 'react';
import { warehouse as api, products as productsApi, consumables as consumablesApi } from '../api';
import { parts as partsApi } from '../api';

export default function Warehouse() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [productId, setProductId] = useState('');
  const [productDetail, setProductDetail] = useState(null);
  const [partId, setPartId] = useState('');
  const [models, setModels] = useState([]);
  const [modelFileId, setModelFileId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [consumableId, setConsumableId] = useState('');
  const [source, setSource] = useState('stock');
  const [location, setLocation] = useState('');
  const [statusLabel, setStatusLabel] = useState('new');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.list().then(setList).catch(() => []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    productsApi.list().then(setProducts).catch(() => []);
    consumablesApi.list().then(setConsumables).catch(() => []);
  }, []);

  useEffect(() => {
    if (!productId) {
      setProductDetail(null);
      setPartId('');
      setModelFileId('');
      setModels([]);
      return;
    }
    productsApi.get(productId).then(p => {
      setProductDetail(p);
      setPartId('');
      setModelFileId('');
      setModels([]);
    }).catch(() => setProductDetail(null));
  }, [productId]);

  useEffect(() => {
    if (!partId) {
      setModels([]);
      setModelFileId('');
      return;
    }
    partsApi.getModels(partId).then(setModels).catch(() => setModels([]));
  }, [partId]);

  useEffect(() => {
    if (models.length) setModelFileId(String(models.find(m => m.status === 'current')?.id || models[0]?.id));
  }, [models]);

  const openAdd = () => {
    setAddModal(true);
    setProductId(products[0]?.id ? String(products[0].id) : '');
    setQuantity(1);
    setConsumableId('');
    setSource('stock');
    setLocation('');
    setStatusLabel('new');
    setError('');
  };

  const submitAdd = async () => {
    if (!productId || !partId || !modelFileId) {
      setError('Выберите изделие, деталь и версию модели');
      return;
    }
    if (source === 'printed' && !consumableId) {
      setError('При «Недавно напечатали» выберите материал (пластик)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.adjust({
        product_id: Number(productId),
        part_id: Number(partId),
        model_file_id: Number(modelFileId),
        status_label: statusLabel,
        quantity_delta: Number(quantity) || 0,
        location: location || undefined,
        consumable_id: consumableId ? Number(consumableId) : undefined,
        source,
      });
      setAddModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const filaments = consumables.filter(c => c.category === 'filament' || c.category === 'resin');

  const deleteItem = async (item) => {
    if (!confirm(`Удалить со склада ${item.product_name} — ${item.part_name} (${item.model_version || '—'})?`)) return;
    try {
      await api.delete(item.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  const byProductPart = {};
  list.forEach(w => {
    const key = `${w.product_id}-${w.part_id}`;
    if (!byProductPart[key]) byProductPart[key] = { product_name: w.product_name, part_name: w.part_name, new: 0, old: 0, items: [] };
    byProductPart[key].items.push(w);
    if (w.status_label === 'new') byProductPart[key].new += Number(w.quantity);
    else byProductPart[key].old += Number(w.quantity);
  });

  const part = productDetail?.parts?.find(p => String(p.id) === String(partId));
  const partWeight = part?.weight_grams;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Склад готовых деталей</h1>
        <button type="button" className="btn btn-primary" onClick={openAdd}>Добавить на склад</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Изделие</th>
              <th>Деталь</th>
              <th>Версия</th>
              <th>Тип</th>
              <th>Материал</th>
              <th>Количество</th>
              <th>Расположение</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(w => (
              <tr key={w.id}>
                <td>{w.product_name}</td>
                <td>{w.part_name}</td>
                <td>{w.model_version}</td>
                <td><span className={`badge badge-${w.status_label}`}>{w.status_label === 'new' ? 'новые' : 'старые'}</span></td>
                <td>{w.consumable_name || '—'}</td>
                <td>{w.quantity}</td>
                <td>{w.location || '—'}</td>
              <td>
                <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteItem(w)}>
                  Удалить
                </button>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.keys(byProductPart).length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Сводка по изделиям</h3>
          <div className="card" style={{ padding: 20 }}>
            {Object.entries(byProductPart).map(([key, row]) => (
              <div key={key} style={{ display: 'flex', gap: 24, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{row.product_name} → {row.part_name}</strong>
                <span>Новые: <strong>{row.new}</strong> шт</span>
                <span>Старые: <strong>{row.old}</strong> шт</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Добавить на склад</h3>
            <div className="form-group">
              <label>Изделие *</label>
              <select value={productId} onChange={e => setProductId(e.target.value)}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {productDetail && (
              <div className="form-group">
                <label>Деталь *</label>
                <select value={partId} onChange={e => setPartId(e.target.value)}>
                  <option value="">Выберите деталь</option>
                  {(productDetail.parts || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {models.length > 0 && (
              <div className="form-group">
                <label>Версия модели *</label>
                <select value={modelFileId} onChange={e => setModelFileId(e.target.value)}>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.version}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Новые / старые</label>
              <select value={statusLabel} onChange={e => setStatusLabel(e.target.value)}>
                <option value="new">Новые</option>
                <option value="old">Старые</option>
              </select>
            </div>
            <div className="form-group">
              <label>Количество *</label>
              <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label>Материал (из какого пластика)</label>
              <select value={consumableId} onChange={e => setConsumableId(e.target.value)}>
                <option value="">— не указан —</option>
                {filaments.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.quantity} {c.unit})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Откуда детали *</label>
              <select value={source} onChange={e => setSource(e.target.value)}>
                <option value="stock">Уже хранились (не вычитать пластик)</option>
                <option value="printed">Недавно напечатали (вычесть вес из расхода пластика)</option>
              </select>
            </div>
            {source === 'printed' && partWeight != null && consumableId && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Будет списано: {(partWeight * quantity / 1000).toFixed(2)} кг с выбранного пластика
              </p>
            )}
            <div className="form-group">
              <label>Расположение</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Полка, ячейка" />
            </div>
            {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={submitAdd} disabled={saving}>{saving ? 'Сохранение...' : 'Добавить'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
