import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shipments as api } from '../api';

export default function Shipments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.list().then(setList).catch(() => []).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Отправка</h1>
        <Link to="/shipments/new" className="btn btn-primary">Новая отправка</Link>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Куда</th>
              <th>Срок</th>
              <th>Статус</th>
              <th>Создано</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id}>
                <td>{s.title || '—'}</td>
                <td>{s.destination}</td>
                <td>{new Date(s.due_date).toLocaleDateString('ru')}</td>
                <td>
                  <span className={`badge ${s.status === 'sent' ? 'badge-completed' : s.status === 'partial' ? 'badge-running' : 'badge-queued'}`}>
                    {s.status === 'sent' ? 'Отправлено' : s.status === 'partial' ? 'Частично' : 'Ожидает'}
                  </span>
                </td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleDateString('ru') : '—'}</td>
                <td><Link to={`/shipments/${s.id}`} className="btn btn-ghost">Подробнее</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
