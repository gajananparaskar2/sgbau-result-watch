const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem('token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body instanceof FormData ? { ...authHeaders, ...headers } : { 'Content-Type': 'application/json', ...authHeaders, ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  register: async (body) => {
    const res = await request('/auth/register', { method: 'POST', body });
    if (res?.token) localStorage.setItem('token', res.token);
    return res;
  },
  login: async (body) => {
    const res = await request('/auth/login', { method: 'POST', body });
    if (res?.token) localStorage.setItem('token', res.token);
    return res;
  },
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('token');
    }
  },
  me: () => request('/auth/me'),

  // Profiles
  listProfiles: () => request('/profiles'),
  getProfile: (id) => request(`/profiles/${id}`),
  createProfile: (body) => request('/profiles', { method: 'POST', body }),
  updateProfile: (id, body) => request(`/profiles/${id}`, { method: 'PUT', body }),
  deleteProfile: (id) => request(`/profiles/${id}`, { method: 'DELETE' }),
  deleteProfilesBatch: (ids) => request('/profiles/batch-delete', { method: 'POST', body: { ids } }),
  checkNow: (id) => request(`/profiles/${id}/check-now`, { method: 'POST' }),

  // Results
  listResults: () => request('/results'),
  getResult: (id) => request(`/results/${id}`),
  deleteResult: (id) => request(`/results/${id}`, { method: 'DELETE' }),
  deleteResultsBatch: (ids) => request('/results/batch-delete', { method: 'POST', body: { ids } }),
  resultPdfUrl: (id) => `${BASE}/results/${id}/pdf`,
  checkInstant: (body) => request('/results/check-instant', { method: 'POST', body }),
  downloadPdfFileUrl: (filename) => `${BASE}/results/download-pdf-file/${filename}`,

  // Upload fallback
  uploadResult: (formData) => request('/upload', { method: 'POST', body: formData }),

  // Admin
  adminDashboard: () => request('/admin/dashboard'),
  adminLogs: () => request('/admin/logs'),
  adminSettings: () => request('/admin/settings'),
  adminUpdateSetting: (body) => request('/admin/settings', { method: 'PUT', body }),
  adminRetryProfile: (id) => request(`/admin/profiles/${id}/retry`, { method: 'POST' })
};
