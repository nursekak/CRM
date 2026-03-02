import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { products as productsApi, printers as printersApi, jobs as jobsApi } from '../api';

export default function CreateJob() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState(null);
  const [partId, setPartId] = useState('');
  const [modelFileId, setModelFileId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [assignedPrinterId, setAssignedPrinterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([productsApi.list(), printersApi.list()]).then(([p, pr]) => {
      setProducts(p);
      setPrinters(pr.filter(x => x.status === 'working'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setPartId('');
      setModelFileId('');
      return;
    }
    productsApi.get(productId).then(setProduct).catch(() => setProduct(null));
  }, [productId]);

  useEffect(() => {
    setPartId('');
    setModelFileId('');
  }, [productId]);

  useEffect(() => {
    setModelFileId('');
  }, [partId]);

  useEffect(() => {
    if (defaultModelId && !modelFileId) setModelFileId(String(defaultModelId));
  }, [defaultModelId]);

  const part = product?.parts?.find(p => String(p.id) === String(partId));
  const models = part ? [] : []; // will load via parts.getModels
  const [modelsList, setModelsList] = useState([]);

  useEffect(() => {
    if (!partId) {
      setModelsList([]);
      return;
    }
    import('../api').then(({ parts: partsApi }) => {
      partsApi.getModels(partId).then(setModelsList).catch(() => setModelsList([]));
    });
  }, [partId]);

  const currentModel = modelsList.find(m => m.status === 'current');
  const defaultModelId = currentModel?.id || modelsList[0]?.id;
  useEffect(() => {
    if (defaultModelId) setModelFileId(String(defaultModelId));
  }, [defaultModelId]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const job = await jobsApi.create({
        product_id: Number(productId),
        part_id: Number(partId),
        model_file_id: Number(modelFileId || defaultModelId),
        quantity: Number(quantity) || 1,
        assigned_printer_id: assignedPrinterId ? Number(assignedPrinterId) : null,
      });
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setError(err.message || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/jobs')}>← К списку</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 24 }}>Новое задание на печать</h1>
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Изделие *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} required>
              <option value="">Выберите изделие</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {product && (
            <div className="form-group">
              <label>Деталь *</label>
              <select value={partId} onChange={e => setPartId(e.target.value)} required>
                <option value="">Выберите деталь</option>
                {(product.parts || []).filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.status === 'archived' ? '(архив)' : ''}</option>
                ))}
              </select>
            </div>
          )}
          {partId && modelsList.length > 0 && (
            <div className="form-group">
              <label>Версия модели *</label>
              <select value={modelFileId || defaultModelId} onChange={e => setModelFileId(e.target.value)} required>
                {modelsList.map(m => (
                  <option key={m.id} value={m.id}>{m.version} ({m.status})</option>
                ))}
              </select>
              {modelsList.some(m => m.status === 'obsolete') && (
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>Используется архивная версия</p>
              )}
            </div>
          )}
          <div className="form-group">
            <label>Количество</label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Принтер</label>
            <select value={assignedPrinterId} onChange={e => setAssignedPrinterId(e.target.value)}>
              <option value="">Не назначен</option>
              {printers.map(p => <option key={p.id} value={p.id}>{p.code} — {p.location}</option>)}
            </select>
          </div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !productId || !partId || !(modelFileId || defaultModelId)}>
              {loading ? 'Создание...' : 'Создать задание'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/jobs')}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
