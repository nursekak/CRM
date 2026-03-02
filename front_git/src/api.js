const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Ошибка запроса');
  return data;
}

export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
};

function del(path) {
  const token = getToken();
  return fetch(API + path, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Ошибка'); }); });
}

export const printers = {
  list: () => request('/printers'),
  get: (id) => request(`/printers/${id}`),
  create: (body) => request('/printers', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, status, status_reason) => request(`/printers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, status_reason }) }),
  update: (id, body) => request(`/printers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => del(`/printers/${id}`),
};

export const consumables = {
  list: (category) => request(category ? `/consumables?category=${category}` : '/consumables'),
  create: (body) => request('/consumables', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/consumables/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => del(`/consumables/${id}`),
};

export const products = {
  list: () => request('/products'),
  get: (id) => request(`/products/${id}`),
  create: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => del(`/products/${id}`),
  addPart: (productId, body) => request(`/products/${productId}/parts`, { method: 'POST', body: JSON.stringify(body) }),
};

export const parts = {
  getModels: (id) => request(`/parts/${id}/models`),
  update: (id, body) => request(`/parts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => del(`/parts/${id}`),
  downloadModel: (modelId) => {
    const token = getToken();
    return fetch(API + `/parts/models/${modelId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(r => {
      if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Ошибка'); });
      return r.blob();
    });
  },
  uploadImage: (partId, file) => {
    const fd = new FormData();
    fd.append('image', file);
    const token = getToken();
    return fetch(API + `/parts/${partId}/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); return d; });
  },
  uploadModel: (partId, file, version, comment, status) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('version', version);
    if (comment) fd.append('comment', comment);
    if (status) fd.append('status', status);
    const token = getToken();
    return fetch(API + `/parts/${partId}/models`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(r => r.json()).then(data => { if (data.error) throw new Error(data.error); return data; });
  },
  setModelStatus: (modelId, status) => request(`/parts/models/${modelId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const warehouse = {
  list: () => request('/warehouse'),
  adjust: (body) => request('/warehouse/adjust', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => del(`/warehouse/${id}`),
};

export const productImage = (productId, file) => {
  const fd = new FormData();
  fd.append('image', file);
  const token = getToken();
  return fetch(API + `/products/${productId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); return d; });
};

export const shipments = {
  list: () => request('/shipments'),
  get: (id) => request(`/shipments/${id}`),
  create: (body) => request('/shipments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/shipments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  fulfill: (id, body) => request(`/shipments/${id}/fulfill`, { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => del(`/shipments/${id}`),
};
