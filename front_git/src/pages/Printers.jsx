import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { printers as api } from '../api';

export default function Printers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);

  const load = () => api.list().then(setList).catch(() => []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const submitAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.create({
      code: fd.get('code'),
      model: fd.get('model') || null,
      serial_number: fd.get('serial_number') || null,
      location: fd.get('location') || null,
      status: fd.get('status') || 'offline',
      ip_address: fd.get('ip_address') || null,
    });
    setAddModal(false);
    load();
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Принтеры</h1>
        <button type="button" className="btn btn-primary" onClick={() => setAddModal(true)}>Добавить принтер</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Модель</th>
              <th>Расположение</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td><Link to={`/printers/${p.id}`}>{p.code}</Link></td>
                <td>{p.model || '—'}</td>
                <td>{p.location || '—'}</td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                <td><Link to={`/printers/${p.id}`} className="btn btn-ghost">Подробнее</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Новый принтер</h3>
            <form onSubmit={submitAdd}>
              <div className="form-group"><label>Код *</label><input name="code" placeholder="P-01" required /></div>
              <div className="form-group"><label>Модель</label><input name="model" placeholder="Prusa i3" /></div>
              <div className="form-group"><label>Серийный номер</label><input name="serial_number" /></div>
              <div className="form-group"><label>Расположение</label><input name="location" placeholder="Цех 1" /></div>
              <div className="form-group"><label>Статус</label><select name="status"><option value="offline">Офлайн</option><option value="working">Исправен</option><option value="maintenance">В ТО</option><option value="broken">Не исправен</option></select></div>
              <div className="form-group"><label>IP-адрес</label><input name="ip_address" /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Добавить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
