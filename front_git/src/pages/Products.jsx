import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products as api } from '../api';

export default function Products() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const load = () => api.list().then(setList);

  useEffect(() => {
    load().catch(() => []).finally(() => setLoading(false));
  }, []);

  const submitAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.create({
      name: fd.get('name'),
      sku: fd.get('sku') || null,
      description: fd.get('description') || null,
      status: fd.get('status') || 'dev',
    });
    setAddModal(false);
    load();
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    const fd = new FormData(e.target);
    await api.update(editProduct.id, {
      name: fd.get('name'),
      sku: fd.get('sku') || null,
      description: fd.get('description') || null,
      status: fd.get('status') || 'dev',
    });
    setEditProduct(null);
    load();
  };

  const deleteProduct = async (p) => {
    if (!confirm(`Удалить изделие «${p.name}»? Сначала удалите все детали.`)) return;
    try {
      await api.delete(p.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>Изделия</h1>
        <button type="button" className="btn btn-primary" onClick={() => setAddModal(true)}>Добавить изделие</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }}></th>
              <th>Название</th>
              <th>SKU</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td style={{ verticalAlign: 'middle' }}>
                  {p.image_path ? (
                    <img src={p.image_path} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'var(--bg-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)' }}>—</div>
                  )}
                </td>
                <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                <td>{p.sku || '—'}</td>
                <td><span className="badge badge-active">{p.status}</span></td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditProduct(p)}>Изменить</button>
                  <Link to={`/products/${p.id}`} className="btn btn-ghost">Детали</Link>
                  <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteProduct(p)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Новое изделие</h3>
            <form onSubmit={submitAdd}>
              <div className="form-group"><label>Название *</label><input name="name" required /></div>
              <div className="form-group"><label>SKU / номер</label><input name="sku" /></div>
              <div className="form-group"><label>Описание</label><textarea name="description" rows={2} /></div>
              <div className="form-group"><label>Статус</label><select name="status"><option value="dev">Разработка</option><option value="production">Производство</option><option value="discontinued">Снято</option></select></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Создать</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditProduct(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Редактировать изделие</h3>
            <form onSubmit={submitEdit}>
              <div className="form-group"><label>Название *</label><input name="name" defaultValue={editProduct.name} required /></div>
              <div className="form-group"><label>SKU / номер</label><input name="sku" defaultValue={editProduct.sku || ''} /></div>
              <div className="form-group"><label>Описание</label><textarea name="description" rows={2} defaultValue={editProduct.description || ''} /></div>
              <div className="form-group"><label>Статус</label><select name="status" defaultValue={editProduct.status}><option value="dev">Разработка</option><option value="production">Производство</option><option value="discontinued">Снято</option></select></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Сохранить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditProduct(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
