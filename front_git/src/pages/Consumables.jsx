import { useState, useEffect } from 'react';
import { consumables as api } from '../api';

const CATEGORIES = [
  { value: '', label: 'Все' },
  { value: 'filament', label: 'Пластик' },
  { value: 'resin', label: 'Смола' },
  { value: 'spare_part', label: 'Запчасти' },
];

export default function Consumables() {
  const [list, setList] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [adjustId, setAdjustId] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');

  const load = () => api.list(category || undefined).then(setList).catch(() => []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [category]);

  const openAdd = () => setModal({ type: 'add' });
  const openEdit = (item) => setModal({ type: 'edit', item });
  const openAdjust = (item) => {
    setAdjustId(item.id);
    setAdjustQty(String(item.quantity));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!modal?.item) return;
    const fd = new FormData(e.target);
    await api.update(modal.item.id, {
      sku: fd.get('sku') || null,
      name: fd.get('name'),
      category: fd.get('category') || 'filament',
      subtype: fd.get('subtype') || null,
      quantity: Number(fd.get('quantity')) || 0,
      unit: fd.get('unit') || 'kg',
      min_threshold: Number(fd.get('min_threshold')) || 0,
      location: fd.get('location') || null,
    });
    setModal(null);
    load();
  };

  const deleteConsumable = async (c) => {
    if (!confirm(`Удалить расходник «${c.name}»?`)) return;
    try {
      await api.delete(c.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.create({
      sku: fd.get('sku') || null,
      name: fd.get('name'),
      category: fd.get('category') || 'filament',
      subtype: fd.get('subtype') || null,
      quantity: Number(fd.get('quantity')) || 0,
      unit: fd.get('unit') || 'kg',
      min_threshold: Number(fd.get('min_threshold')) || 0,
      location: fd.get('location') || null,
    });
    setModal(null);
    load();
  };

  const submitAdjust = async () => {
    if (adjustId == null) return;
    await api.update(adjustId, { quantity: Number(adjustQty) });
    setAdjustId(null);
    load();
  };

  const isLow = (c) => c.min_threshold != null && Number(c.quantity) < Number(c.min_threshold);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Расходники</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {CATEGORIES.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={openAdd}>Добавить</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>SKU / Название</th>
              <th>Категория</th>
              <th>Остаток</th>
              <th>Порог</th>
              <th>Ед.</th>
              <th>Расположение</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} style={isLow(c) ? { borderLeft: '3px solid var(--warning)' } : undefined}>
                <td><strong>{c.sku || c.name}</strong>{c.sku && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.name}</div>}</td>
                <td>{c.category}</td>
                <td>{c.quantity} {isLow(c) && <span className="badge badge-broken">низкий</span>}</td>
                <td>{c.min_threshold ?? '—'}</td>
                <td>{c.unit}</td>
                <td>{c.location || '—'}</td>
                <td>
                  {adjustId === c.id ? (
                    <>
                      <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} style={{ width: 80, marginRight: 8, padding: 6 }} />
                      <button type="button" className="btn btn-primary" onClick={submitAdjust}>OK</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setAdjustId(null)}>Отмена</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(c)}>Изменить</button>
                      <button type="button" className="btn btn-ghost" onClick={() => openAdjust(c)}>Остаток</button>
                      <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteConsumable(c)}>Удалить</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal?.type === 'add' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Новый расходник</h3>
            <form onSubmit={submitAdd}>
              <div className="form-group"><label>Название *</label><input name="name" required /></div>
              <div className="form-group"><label>SKU</label><input name="sku" /></div>
              <div className="form-group"><label>Категория</label><select name="category">{CATEGORIES.filter(x => x.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="form-group"><label>Подтип</label><input name="subtype" placeholder="PLA 1.75mm" /></div>
              <div className="form-group"><label>Количество</label><input name="quantity" type="number" step="any" defaultValue={0} /></div>
              <div className="form-group"><label>Ед.</label><select name="unit"><option value="kg">kg</option><option value="roll">рулон</option><option value="pcs">шт</option></select></div>
              <div className="form-group"><label>Мин. порог</label><input name="min_threshold" type="number" step="any" defaultValue={0} /></div>
              <div className="form-group"><label>Расположение</label><input name="location" /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Создать</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modal?.type === 'edit' && modal?.item && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Редактировать расходник</h3>
            <form onSubmit={submitEdit}>
              <div className="form-group"><label>Название *</label><input name="name" defaultValue={modal.item.name} required /></div>
              <div className="form-group"><label>SKU</label><input name="sku" defaultValue={modal.item.sku || ''} /></div>
              <div className="form-group"><label>Категория</label><select name="category" defaultValue={modal.item.category}>{CATEGORIES.filter(x => x.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="form-group"><label>Подтип</label><input name="subtype" defaultValue={modal.item.subtype || ''} placeholder="PLA 1.75mm" /></div>
              <div className="form-group"><label>Количество</label><input name="quantity" type="number" step="any" defaultValue={modal.item.quantity} /></div>
              <div className="form-group"><label>Ед.</label><select name="unit" defaultValue={modal.item.unit}><option value="kg">kg</option><option value="roll">рулон</option><option value="pcs">шт</option></select></div>
              <div className="form-group"><label>Мин. порог</label><input name="min_threshold" type="number" step="any" defaultValue={modal.item.min_threshold ?? 0} /></div>
              <div className="form-group"><label>Расположение</label><input name="location" defaultValue={modal.item.location || ''} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Сохранить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
