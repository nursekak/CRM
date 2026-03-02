import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipments as api } from '../api';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [fulfillModal, setFulfillModal] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [editingTitle, setEditingTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const load = () => api.get(id).then(setShipment);

  useEffect(() => {
    load().catch(() => setShipment(null));
  }, [id]);

  useEffect(() => {
    if (!shipment?.items) return;
    setEditingTitle(shipment.title || '');
    const q = {};
    shipment.items.forEach(it => {
      q[it.id] = Math.max(0, (it.quantity_ordered || 0) - (it.quantity_sent || 0));
    });
    setQuantities(q);
  }, [shipment]);

  const submitFulfill = async () => {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ item_id: Number(itemId), quantity_sent: qty }));
    if (items.length === 0) return;
    await api.fulfill(id, { items });
    setFulfillModal(false);
    load();
  };

  const saveTitle = async () => {
    setSavingTitle(true);
    try {
      await api.update(id, { title: editingTitle || null });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTitle(false);
    }
  };

  const deleteShipment = async () => {
    if (!confirm(`Удалить отправку #${shipment.id}?`)) return;
    try {
      await api.delete(id);
      navigate('/shipments');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!shipment) return <p>Отправка не найдена</p>;

  const canFulfill = shipment.items?.some(it => (it.quantity_ordered || 0) > (it.quantity_sent || 0));
  const statusLabel = shipment.status === 'sent' ? 'Отправлено' : shipment.status === 'partial' ? 'Частично отправлено' : 'Ожидает';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/shipments')}>← К списку</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 8 }}>Отправка #{shipment.id}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input
          value={editingTitle}
          onChange={e => setEditingTitle(e.target.value)}
          placeholder="Название отправки"
          style={{ minWidth: 260 }}
        />
        <button type="button" className="btn btn-ghost" onClick={saveTitle} disabled={savingTitle}>
          {savingTitle ? 'Сохранение...' : 'Сохранить название'}
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Куда: {shipment.destination} · Срок: {new Date(shipment.due_date).toLocaleDateString('ru')} · {statusLabel}
      </p>
      <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)', marginBottom: 24 }} onClick={deleteShipment}>
        Удалить отправку
      </button>
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>Позиции</h3>
        <table>
          <thead>
            <tr>
              <th>Изделие / Деталь · материал</th>
              <th>Заказано</th>
              <th>Отправлено</th>
              <th>Осталось</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items?.map(it => (
              <tr key={it.id}>
                <td>{it.product_name || '—'} — {it.part_name || '—'} ({it.model_version || '—'}) · {it.consumable_name || '—'}</td>
                <td>{it.quantity_ordered}</td>
                <td>{it.quantity_sent}</td>
                <td>{Math.max(0, (it.quantity_ordered || 0) - (it.quantity_sent || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canFulfill && (
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setFulfillModal(true)}>
            Сделать отправку
          </button>
        )}
      </div>
      {fulfillModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setFulfillModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Сколько отправляем?</h3>
            {shipment.items?.filter(it => (it.quantity_ordered || 0) > (it.quantity_sent || 0)).map(it => (
              <div key={it.id} className="form-group">
                <label>{it.product_name} — {it.part_name} · {it.consumable_name || '—'} (к отправке: {it.quantity_ordered - it.quantity_sent} шт)</label>
                <input
                  type="number"
                  min={0}
                  max={it.quantity_ordered - it.quantity_sent}
                  value={quantities[it.id] ?? 0}
                  onChange={e => setQuantities(prev => ({ ...prev, [it.id]: Number(e.target.value) || 0 }))}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={submitFulfill}>Отправить</button>
              <button type="button" className="btn btn-ghost" onClick={() => setFulfillModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
