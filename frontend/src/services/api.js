// StockSense — API Service Layer
// Calls backend at http://localhost:8000/api/
// Falls back to mock data when backend is unavailable

const API_BASE = 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
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

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`API call failed for ${endpoint}, using mock data:`, error.message);
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
  exportCsv: () => `${API_BASE}/reorder/export?format=csv`,
  exportPdf: () => `${API_BASE}/reorder/export?format=pdf`,
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
