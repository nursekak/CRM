import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products as productsApi, parts as partsApi, productImage } from '../api';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [tab, setTab] = useState('active');
  const [addPartModal, setAddPartModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(null);
  const [modelVersion, setModelVersion] = useState('');
  const [modelComment, setModelComment] = useState('');
  const [modelFile, setModelFile] = useState(null);
  const [editProductModal, setEditProductModal] = useState(false);
  const [editPartModal, setEditPartModal] = useState(null);
  const productImageRef = useRef(null);
  const partImageRefs = useRef({});

  const load = () => productsApi.get(id).then(setProduct);

  const onProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await productImage(id, file);
    load();
  };


  useEffect(() => {
    load().catch(() => setProduct(null));
  }, [id]);

  const submitPart = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await productsApi.addPart(id, {
      name: fd.get('name'),
      part_code: fd.get('part_code') || null,
      recommended_material: fd.get('recommended_material') || null,
      weight_grams: fd.get('weight_grams') ? Number(fd.get('weight_grams')) : null,
    });
    setAddPartModal(false);
    load();
  };

  const archivePart = async (partId, reason) => {
    if (!reason?.trim()) return;
    await partsApi.update(partId, { status: 'archived', archive_reason: reason });
    load();
  };

  const uploadModel = async () => {
    if (!uploadModal || !modelVersion.trim()) return;
    await partsApi.uploadModel(uploadModal.id, modelFile, modelVersion, modelComment, 'current');
    setUploadModal(null);
    setModelVersion('');
    setModelComment('');
    setModelFile(null);
    load();
  };

  const setModelAsCurrent = async (partId, modelId) => {
    const models = await partsApi.getModels(partId);
    for (const m of models) {
      await partsApi.setModelStatus(m.id, m.id === modelId ? 'current' : 'obsolete');
    }
    load();
  };

  const submitEditProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await productsApi.update(id, { name: fd.get('name'), sku: fd.get('sku') || null, description: fd.get('description') || null, status: fd.get('status') || 'dev' });
    setEditProductModal(false);
    load();
  };

  const submitEditPart = async (e) => {
    e.preventDefault();
    if (!editPartModal) return;
    const fd = new FormData(e.target);
    await partsApi.update(editPartModal.id, {
      name: fd.get('name'),
      part_code: fd.get('part_code') || null,
      recommended_material: fd.get('recommended_material') || null,
      weight_grams: fd.get('weight_grams') ? Number(fd.get('weight_grams')) : null,
    });
    setEditPartModal(null);
    load();
  };

  const deleteProductClick = async () => {
    if (!confirm(`Удалить изделие «${product.name}»? Сначала удалите все детали.`)) return;
    try {
      await productsApi.delete(id);
      navigate('/products');
    } catch (err) {
      alert(err.message);
    }
  };

  const deletePartClick = async (part) => {
    if (!confirm(`Удалить деталь «${part.name}»?`)) return;
    try {
      await partsApi.delete(part.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!product) return <p>Изделие не найдено</p>;

  const activeParts = product.parts?.filter(p => p.status === 'active') || [];
  const archivedParts = product.parts?.filter(p => p.status === 'archived') || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/products')}>← К списку</button>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{product.name}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{product.description || '—'}</p>
          {product.image_path && (
            <img src={product.image_path} alt={product.name} style={{ width: 240, height: 240, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
          )}
          <div style={{ marginTop: 8 }}>
            <input ref={productImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onProductImageUpload} />
            <button type="button" className="btn btn-ghost" onClick={() => productImageRef.current?.click()}>
              {product.image_path ? 'Заменить картинку' : 'Прикрепить картинку'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditProductModal(true)}>Редактировать</button>
            <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={deleteProductClick}>Удалить изделие</button>
          </div>
        </div>
      </div>
      {editProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditProductModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Редактировать изделие</h3>
            <form onSubmit={submitEditProduct}>
              <div className="form-group"><label>Название *</label><input name="name" defaultValue={product.name} required /></div>
              <div className="form-group"><label>SKU / номер</label><input name="sku" defaultValue={product.sku || ''} /></div>
              <div className="form-group"><label>Описание</label><textarea name="description" rows={2} defaultValue={product.description || ''} /></div>
              <div className="form-group"><label>Статус</label><select name="status" defaultValue={product.status}><option value="dev">Разработка</option><option value="production">Производство</option><option value="discontinued">Снято</option></select></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Сохранить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditProductModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={() => setTab('active')} style={{ marginRight: 8 }}>Актуальные детали</button>
        <button type="button" className="btn btn-ghost" onClick={() => setTab('archived')}>Архив</button>
      </div>
      <div className="card" style={{ padding: 20 }}>
        {tab === 'active' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Актуальные детали</h3>
              <button type="button" className="btn btn-primary" onClick={() => setAddPartModal(true)}>Добавить деталь</button>
            </div>
            {activeParts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Нет актуальных деталей. Добавьте деталь и загрузите модели.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activeParts.map(part => (
                  <li key={part.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          {part.image_path && (
                            <img src={part.image_path} alt={part.name} style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                          )}
                          <div>
                            <strong>{part.name}</strong> {part.part_code && <span style={{ color: 'var(--text-muted)' }}>({part.part_code})</span>}
                            {part.weight_grams != null && (
                              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>Вес: {part.weight_grams} г</span>
                            )}
                            <div style={{ marginTop: 4 }}>
                              <input
                                ref={el => partImageRefs.current[part.id] = el}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => { partsApi.uploadImage(part.id, e.target.files?.[0]).then(load); e.target.value = ''; }}
                              />
                              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => partImageRefs.current[part.id]?.click()}>
                                {part.image_path ? 'Сменить картинку' : 'Картинка детали'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {part.current_models > 0 ? (
                            <PartsModelList partId={part.id} partWeight={part.weight_grams} onSetCurrent={setModelAsCurrent} onUpload={() => setUploadModal(part)} />
                          ) : (
                            <button type="button" className="btn btn-ghost" onClick={() => setUploadModal(part)}>Загрузить модель</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setEditPartModal(part)}>Изменить</button>
                        <button type="button" className="btn btn-ghost" onClick={() => archivePart(part.id, prompt('Причина архивации?'))}>В архив</button>
                        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deletePartClick(part)}>Удалить</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === 'archived' && (
          <>
            <h3 style={{ margin: '0 0 16px' }}>Архивные детали</h3>
            {archivedParts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Нет архивных деталей.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {archivedParts.map(part => (
                  <li key={part.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {part.image_path && (
                        <img src={part.image_path} alt={part.name} style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 6 }} />
                      )}
                      <div>
                        <strong>{part.name}</strong>
                        {part.weight_grams != null && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>Вес: {part.weight_grams} г</span>}
                        — <span className="badge badge-archived">архив</span> {part.archive_reason && `(${part.archive_reason})`}
                        <div style={{ marginTop: 6 }}><PartsModelList partId={part.id} readOnly /></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {addPartModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddPartModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Новая деталь</h3>
            <form onSubmit={submitPart}>
              <div className="form-group"><label>Название *</label><input name="name" required /></div>
              <div className="form-group"><label>Код детали</label><input name="part_code" /></div>
              <div className="form-group"><label>Рекомендуемый материал</label><input name="recommended_material" /></div>
              <div className="form-group"><label>Вес (г)</label><input name="weight_grams" type="number" step="any" /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Создать</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddPartModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editPartModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditPartModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Редактировать деталь</h3>
            <form onSubmit={submitEditPart}>
              <div className="form-group"><label>Название *</label><input name="name" defaultValue={editPartModal.name} required /></div>
              <div className="form-group"><label>Код детали / номер</label><input name="part_code" defaultValue={editPartModal.part_code || ''} /></div>
              <div className="form-group"><label>Рекомендуемый материал</label><input name="recommended_material" defaultValue={editPartModal.recommended_material || ''} /></div>
              <div className="form-group"><label>Вес (г)</label><input name="weight_grams" type="number" step="any" defaultValue={editPartModal.weight_grams ?? ''} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Сохранить</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditPartModal(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {uploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setUploadModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Загрузить модель: {uploadModal.name}</h3>
            <div className="form-group"><label>Версия *</label><input value={modelVersion} onChange={e => setModelVersion(e.target.value)} placeholder="v1.0" /></div>
            <div className="form-group"><label>Файл</label><input type="file" accept=".stl,.3mf,.step,.gcode" onChange={e => setModelFile(e.target.files?.[0])} /></div>
            <div className="form-group"><label>Комментарий</label><input value={modelComment} onChange={e => setModelComment(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={uploadModel} disabled={!modelVersion.trim()}>Загрузить</button>
              <button type="button" className="btn btn-ghost" onClick={() => setUploadModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartsModelList({ partId, partWeight, onSetCurrent, onUpload, readOnly }) {
  const [models, setModels] = useState([]);
  useEffect(() => {
    partsApi.getModels(partId).then(setModels).catch(() => setModels([]));
  }, [partId]);

  const downloadStl = async (m) => {
    try {
      const blob = await partsApi.downloadModel(m.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${m.version || 'model'}.${(m.file_type || 'stl').toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Ошибка скачивания');
    }
  };

  if (models.length === 0) return null;
  return (
    <div style={{ fontSize: 13 }}>
      {models.map(m => (
        <div key={m.id} style={{ marginBottom: 12, padding: 8, background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge badge-${m.status}`}>{m.version}</span>
            {m.file_path && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => downloadStl(m)}>Скачать 3D</button>
            )}
            {!readOnly && m.status !== 'current' && onSetCurrent && (
              <button type="button" className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => onSetCurrent(partId, m.id)}>Сделать текущей</button>
            )}
          </div>
        </div>
      ))}
      {!readOnly && onUpload && <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onUpload()}>+ Ещё версия</button>}
    </div>
  );
}
