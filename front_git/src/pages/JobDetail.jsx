import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobs as api } from '../api';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [actualQty, setActualQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get(id).then(setJob);

  useEffect(() => {
    load().catch(() => setJob(null));
  }, [id]);

  const start = async () => {
    await api.start(id);
    load();
  };

  const complete = async () => {
    setSaving(true);
    try {
      await api.complete(id, { actual_quantity: actualQty ? Number(actualQty) : undefined, notes });
      setCompleteModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!confirm('Отменить задание?')) return;
    await api.cancel(id);
    load();
  };

  if (!job) return <p>Задание не найдено</p>;

  const canStart = job.status === 'queued' && job.assigned_printer_id;
  const canComplete = job.status === 'running';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/jobs')}>← К списку</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{job.job_code}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        {job.product_name} / {job.part_name} — {job.model_version}
      </p>
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <p><strong>Количество:</strong> {job.quantity}</p>
        <p><strong>Принтер:</strong> {job.printer_code || '—'}</p>
        <p><strong>Статус:</strong> <span className={`badge badge-${job.status}`}>{job.status}</span></p>
        {job.started_at && <p><strong>Начало:</strong> {new Date(job.started_at).toLocaleString()}</p>}
        {job.finished_at && <p><strong>Завершён:</strong> {new Date(job.finished_at).toLocaleString()}</p>}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {canStart && <button type="button" className="btn btn-primary" onClick={start}>Запустить печать</button>}
          {canComplete && <button type="button" className="btn btn-primary" onClick={() => { setActualQty(String(job.quantity)); setCompleteModal(true); }}>Завершить</button>}
          {(job.status === 'queued' || job.status === 'running') && <button type="button" className="btn btn-danger" onClick={cancel}>Отменить</button>}
        </div>
      </div>
      {completeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCompleteModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Завершить задание</h3>
            <div className="form-group"><label>Фактическое количество</label><input type="number" value={actualQty} onChange={e => setActualQty(e.target.value)} placeholder={String(job.quantity)} /></div>
            <div className="form-group"><label>Заметки</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={complete} disabled={saving}>{saving ? 'Сохранение...' : 'Завершить'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCompleteModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
