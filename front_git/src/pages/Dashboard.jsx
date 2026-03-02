import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { printers as printersApi, consumables, shipments as shipmentsApi } from '../api';

export default function Dashboard() {
  const [printers, setPrinters] = useState([]);
  const [consumablesList, setConsumablesList] = useState([]);
  const [shipmentsList, setShipmentsList] = useState([]);

  useEffect(() => {
    Promise.all([
      printersApi.list().then(setPrinters).catch(() => []),
      consumables.list().then(setConsumablesList).catch(() => []),
      shipmentsApi.list().then(setShipmentsList).catch(() => []),
    ]);
  }, []);

  const broken = printers.filter(p => p.status === 'broken');
  const lowStock = consumablesList.filter(c => c.min_threshold != null && Number(c.quantity) < Number(c.min_threshold));
  const pendingShipments = shipmentsList.filter(s => s.status === 'pending' || s.status === 'partial');
  const today = new Date().toISOString().slice(0, 10);
  const overdue = pendingShipments.filter(s => s.due_date < today);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 24 }}>Дашборд</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Принтеры</h3>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{printers.length}</div>
          <div style={{ marginTop: 8 }}>
            {printers.slice(0, 3).map(p => (
              <span key={p.id} className={`badge badge-${p.status}`} style={{ marginRight: 6 }}>{p.code}</span>
            ))}
          </div>
          <Link to="/printers" className="btn btn-ghost" style={{ marginTop: 12 }}>Перейти →</Link>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Ожидают отправки</h3>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{pendingShipments.length}</div>
          {pendingShipments.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {pendingShipments.slice(0, 3).map(s => (
                <li key={s.id}><Link to={`/shipments/${s.id}`}>{s.destination}</Link> — до {new Date(s.due_date).toLocaleDateString('ru')}</li>
              ))}
            </ul>
          )}
          <Link to="/shipments" className="btn btn-ghost" style={{ marginTop: 12 }}>Отправка →</Link>
        </div>
        <div className="card" style={{ padding: 20, borderColor: overdue.length ? 'var(--danger)' : undefined }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Просроченные отправки</h3>
          <div style={{ fontSize: 28, fontWeight: 600, color: overdue.length ? 'var(--danger)' : undefined }}>{overdue.length}</div>
          {overdue.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {overdue.map(s => (
                <li key={s.id}><Link to={`/shipments/${s.id}`}>{s.destination}</Link></li>
              ))}
            </ul>
          )}
          <Link to="/shipments" className="btn btn-ghost" style={{ marginTop: 12 }}>Отправка →</Link>
        </div>
        <div className="card" style={{ padding: 20, borderColor: broken.length ? 'var(--danger)' : undefined }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Неисправные принтеры</h3>
          <div style={{ fontSize: 28, fontWeight: 600, color: broken.length ? 'var(--danger)' : undefined }}>{broken.length}</div>
          {broken.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {broken.map(p => (
                <li key={p.id}><Link to={`/printers/${p.id}`}>{p.code}</Link> — {p.status_reason || 'причина не указана'}</li>
              ))}
            </ul>
          )}
          <Link to="/printers" className="btn btn-ghost" style={{ marginTop: 12 }}>Принтеры →</Link>
        </div>
        <div className="card" style={{ padding: 20, borderColor: lowStock.length ? 'var(--warning)' : undefined }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Низкий остаток расходников</h3>
          <div style={{ fontSize: 28, fontWeight: 600, color: lowStock.length ? 'var(--warning)' : undefined }}>{lowStock.length}</div>
          {lowStock.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {lowStock.map(c => (
                <li key={c.id}>{c.name} — {c.quantity} {c.unit}</li>
              ))}
            </ul>
          )}
          <Link to="/consumables" className="btn btn-ghost" style={{ marginTop: 12 }}>Расходники →</Link>
        </div>
      </div>
    </div>
  );
}
