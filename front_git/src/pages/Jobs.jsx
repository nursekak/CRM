import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs as api } from '../api';

export default function Jobs() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.list(filter || undefined).then(setList).catch(() => []).finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Задания</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <option value="">Все</option>
            <option value="queued">В очереди</option>
            <option value="running">Печатается</option>
            <option value="completed">Завершённые</option>
            <option value="cancelled">Отменённые</option>
          </select>
          <Link to="/jobs/new" className="btn btn-primary">Создать задание</Link>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Изделие / Деталь</th>
              <th>Версия</th>
              <th>Кол-во</th>
              <th>Принтер</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(j => (
              <tr key={j.id}>
                <td><Link to={`/jobs/${j.id}`}>{j.job_code}</Link></td>
                <td>{j.product_name} / {j.part_name}</td>
                <td>{j.model_version}</td>
                <td>{j.quantity}</td>
                <td>{j.printer_code || '—'}</td>
                <td><span className={`badge badge-${j.status}`}>{j.status}</span></td>
                <td><Link to={`/jobs/${j.id}`} className="btn btn-ghost">Подробнее</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
