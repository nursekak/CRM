import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { printers as api } from '../api';

const STATUS_OPTIONS = [
  { value: 'working', label: 'Исправен' },
  { value: 'broken', label: 'Не исправен' },
  { value: 'maintenance', label: 'В ТО' },
  { value: 'offline', label: 'Офлайн' },
];

export default function PrinterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState(null);
  const [status, setStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const load = () => api.get(id).then(setPrinter);

  useEffect(() => {
    load().catch(() => setPrinter(null));
  }, [id]);

  const updateStatus = async () => {
    if (!status) return;
    setSaving(true);
    try {
      await api.updateStatus(id, status, statusReason);
      setPrinter(prev => ({ ...prev, status, status_reason: statusReason }));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setSaving(true);
    try {
      await api.update(id, {
        code: fd.get('code'),
        model: fd.get('model') || null,
        serial_number: fd.get('serial_number') || null,
        location: fd.get('location') || null,
        status: fd.get('status') || null,
        status_reason: fd.get('status_reason') || null,
        ip_address: fd.get('ip_address') || null,
      });
      setEditModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deletePrinter = async () => {
    if (!confirm(`Удалить принтер «${printer.code}»?`)) return;
    try {
      await api.delete(id);
      navigate('/printers');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!printer) return <p>Принтер не найден</p>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/printers')}>← К списку</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 24 }}>{printer.code}</h1>
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={() => setEditModal(true)}>Редактировать</button>
        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={deletePrinter}>Удалить принтер</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>Параметры</h3>
          <p><strong>Модель:</strong> {printer.model || '—'}</p>
          <p><strong>Серийный номер:</strong> {printer.serial_number || '—'}</p>
          <p><strong>Расположение:</strong> {printer.location || '—'}</p>
          <p><strong>IP:</strong> {printer.ip_address || '—'}</p>
          <p><strong>Статус:</strong> <span className={`badge badge-${printer.status}`}>{printer.status}</span></p>
          {printer.status_reason && <p><strong>Причина:</strong> {printer.status_reason}</p>}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px' }}>Изменить статус</h3>
          <div className="form-group">
            <label>Статус</label>
            <select value={status || printer.status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Причина (обязательно при «Не исправен»)</label>
            <input
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder="Например: засорение сопла"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={updateStatus} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить статус'}
          </button>
        </div>
      </div>
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Редактировать принтер</h3>
            <form onSubmit={submitEdit}>
              <div className="form-group"><label>Код *</label><input name="code" defaultValue={printer.code} required /></div>
              <div className="form-group"><label>Модель</label><input name="model" defaultValue={printer.model || ''} /></div>
              <div className="form-group"><label>Серийный номер</label><input name="serial_number" defaultValue={printer.serial_number || ''} /></div>
              <div className="form-group"><label>Расположение</label><input name="location" defaultValue={printer.location || ''} /></div>
              <div className="form-group"><label>Статус</label><select name="status" defaultValue={printer.status}><option value="offline">Офлайн</option><option value="working">Исправен</option><option value="maintenance">В ТО</option><option value="broken">Не исправен</option></select></div>
              <div className="form-group"><label>Причина (если не исправен)</label><input name="status_reason" defaultValue={printer.status_reason || ''} /></div>
              <div className="form-group"><label>IP-адрес</label><input name="ip_address" defaultValue={printer.ip_address || ''} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>Сохранить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
