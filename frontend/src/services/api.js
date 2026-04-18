// StockSense — API Service Layer with Request Deduplication
// In dev: requests go through Vite proxy (/api → backend:8000)
// In Docker/prod: requests go through nginx (/api → backend:8000)

const API_BASE = '/api';

// ── Request Deduplication ──────────────────────────────────
// If the same GET endpoint is already in-flight, return the
// existing Promise instead of firing a duplicate request.
const _inflight = new Map();

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('stocksense-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Dedup GET requests: if same URL is already in-flight, piggyback on it
  if (method === 'GET') {
    const existing = _inflight.get(url);
    if (existing) {
      return existing;
    }
  }

  const promise = _doFetch(url, config, endpoint);

  if (method === 'GET') {
    _inflight.set(url, promise);
    // Clean up after settled (success or error)
    promise.finally(() => _inflight.delete(url));
  }

  return promise;
}

async function _doFetch(url, config, endpoint) {
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      // ── Auto-logout on 401 (expired / invalid token) ──
      if (response.status === 401) {
        // Skip auto-logout for auth endpoints (login/register)
        if (!endpoint.startsWith('/auth/')) {
          localStorage.removeItem('stocksense-token');
          localStorage.removeItem('stocksense-user');
          window.dispatchEvent(new Event('auth-change'));
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      }

      // Try to extract error detail from FastAPI responses
      let detail = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.detail) {
          // FastAPI detail can be a string or array of validation errors
          if (typeof errorBody.detail === 'string') {
            detail = errorBody.detail;
          } else if (Array.isArray(errorBody.detail)) {
            detail = errorBody.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
          } else {
            detail = JSON.stringify(errorBody.detail);
          }
        }
      } catch (_) {
        // Response body wasn't JSON, use the default message
      }
      throw new Error(detail);
    }
    return await response.json();
  } catch (error) {
    console.warn(`API call failed for ${endpoint}:`, error.message);
    throw error;
  }
}

// === Auth ===
export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

// === Upload ===
export const uploadApi = {
  csv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload/csv', { method: 'POST', body: formData, headers: {} });
  },
  image: (image) => {
    const formData = new FormData();
    formData.append('image', image);
    return request('/upload/image', { method: 'POST', body: formData, headers: {} });
  },
  verify: (data) => request('/upload/verify', { method: 'POST', body: JSON.stringify(data) }),
};

// === Inventory ===
export const inventoryApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory${query ? '?' + query : ''}`);
  },
  get: (id) => request(`/inventory/${id}`),
  create: (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  health: () => request('/inventory/health'),
  expiring: (days = 7) => request(`/inventory/expiring?days=${days}`),
};

// === Forecasting ===
export const forecastApi = {
  get: (productId) => request(`/forecast/${productId}`),
  all: () => request('/forecast/all'),
  scenario: (data) => request('/forecast/scenario', { method: 'POST', body: JSON.stringify(data) }),
};

// === Anomalies ===
export const anomalyApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/anomalies${query ? '?' + query : ''}`);
  },
  byProduct: (productId) => request(`/anomalies/${productId}`),
};

// === Reorder ===
export const reorderApi = {
  list: () => request('/reorder'),
  exportFile: async (format = 'csv') => {
    const url = `${API_BASE}/reorder/export?format=${format}`;
    const token = localStorage.getItem('stocksense-token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')
      ?.match(/filename=(.+)/)?.[1] || `reorder_list.${format}`;
    // Trigger browser download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },
};

// === Alerts ===
export const alertsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts${query ? '?' + query : ''}`);
  },
  dismiss: (id) => request(`/alerts/${id}/dismiss`, { method: 'PUT' }),
};

// === Settings ===
export const settingsApi = {
  getNotifications: () => request('/notifications/settings'),
  updateNotifications: (data) => request('/notifications/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// === WhatsApp ===
export const whatsappApi = {
  connect: () => request('/whatsapp/connect', { method: 'POST' }),
  status: () => request('/whatsapp/status'),
};

// === Sales ===
export const salesApi = {
  uploadCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/sales/upload-csv', { method: 'POST', body: formData, headers: {} });
  },
  uploadImage: (image) => {
    const formData = new FormData();
    formData.append('image', image);
    // Reuses the OCR endpoint — returns { extracted_data, overall_confidence }
    return request('/upload/image', { method: 'POST', body: formData, headers: {} });
  },
  record: (sales) => request('/sales/record', { method: 'POST', body: JSON.stringify({ sales }) }),
  history: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales/history${query ? '?' + query : ''}`);
  },
};
