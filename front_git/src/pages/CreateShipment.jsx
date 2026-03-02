import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipments as api, products as productsApi, consumables as consumablesApi } from '../api';
import { parts as partsApi } from '../api';

export default function CreateShipment() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [productDetail, setProductDetail] = useState(null);
  const [partId, setPartId] = useState('');
  const [models, setModels] = useState([]);
  const [modelFileId, setModelFileId] = useState('');
  const [consumables, setConsumables] = useState([]);
  const [consumableId, setConsumableId] = useState('');
  const [statusLabel, setStatusLabel] = useState('new');
  const [addQty, setAddQty] = useState(1);

  useEffect(() => {
    productsApi.list().then(setProducts).catch(() => []);
    consumablesApi.list().then(setConsumables).catch(() => []);
  }, []);

  useEffect(() => {
    if (!productId) {
      setProductDetail(null);
      setPartId('');
      setModels([]);
      setModelFileId('');
      return;
    }
    productsApi.get(productId)
      .then(p => {
        setProductDetail(p);
        setPartId('');
        setModels([]);
        setModelFileId('');
      })
      .catch(() => {
        setProductDetail(null);
        setPartId('');
        setModels([]);
        setModelFileId('');
      });
  }, [productId]);

  useEffect(() => {
    if (!partId) {
      setModels([]);
      setModelFileId('');
      return;
    }
    partsApi.getModels(partId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [partId]);

  useEffect(() => {
    if (models.length) {
      const current = models.find(m => m.status === 'current') || models[0];
      setModelFileId(String(current.id));
    }
  }, [models]);

  const addItem = () => {
    if (!productId || !partId || !modelFileId || !consumableId || !addQty || addQty < 1) {
      setError('Выберите изделие, деталь, версию модели, материал и количество');
      return;
    }
    setError('');
    const productName = products.find(p => String(p.id) === String(productId))?.name || 'Изделие';
    const partName = (productDetail?.parts || []).find(p => String(p.id) === String(partId))?.name || 'Деталь';
    const model = models.find(m => String(m.id) === String(modelFileId));
    const consumable = consumables.find(c => String(c.id) === String(consumableId));
    const label = `${productName} — ${partName} (${model?.version || '—'}) · ${consumable?.name || 'материал не указан'}`;

    setItems(prev => [
      ...prev,
      {
        product_id: Number(productId),
        part_id: Number(partId),
        model_file_id: Number(modelFileId),
        status_label: statusLabel || 'new',
        consumable_id: Number(consumableId),
        quantity_ordered: addQty,
        _label: label,
      },
    ]);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!destination.trim() || !dueDate) {
      setError('Укажите куда и срок');
      return;
    }
    if (items.length === 0) {
      setError('Добавьте хотя бы одну позицию');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = items.map(({ product_id, part_id, model_file_id, status_label, consumable_id, quantity_ordered }) => ({
        product_id,
        part_id,
        model_file_id,
        status_label: status_label || 'new',
        consumable_id,
        quantity_ordered,
      }));
      const s = await api.create({ destination: destination.trim(), due_date: dueDate, items: payload });
      navigate(`/shipments/${s.id}`);
    } catch (err) {
      setError(err.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const filaments = consumables.filter(c => c.category === 'filament' || c.category === 'resin');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/shipments')}>← К списку</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 16 }}>Новая отправка</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Здесь мы планируем, <strong>что</strong> и <strong>до какого числа</strong> нужно отправить. 
        Можно добавлять любые изделия и детали из базы, даже если их сейчас нет на складе.
      </p>
      <div className="card" style={{ padding: 24, maxWidth: 700 }}>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Куда (адрес / получатель) *</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Куда отправить" required />
          </div>
          <div className="form-group">
            <label>Срок *</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
          </div>

          <h3 style={{ margin: '16px 0 8px' }}>Добавить позицию</h3>
          <div className="form-group">
            <label>Изделие *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Выберите изделие</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
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
            <label>Материал *</label>
            <select value={consumableId} onChange={e => setConsumableId(e.target.value)}>
              <option value="">Выберите материал</option>
              {filaments.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Новые / старые</label>
            <select value={statusLabel} onChange={e => setStatusLabel(e.target.value)}>
              <option value="new">Новые</option>
              <option value="old">Старые</option>
            </select>
          </div>
          <div className="form-group">
            <label>Количество *</label>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={e => setAddQty(Number(e.target.value) || 1)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={addItem}>
              Добавить в отправку
            </button>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
            {items.map((it, i) => (
              <li
                key={i}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{it._label} × {it.quantity_ordered}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px' }}
                  onClick={() => removeItem(i)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>

          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>
              {saving ? 'Создание...' : 'Создать отправку'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/shipments')}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
