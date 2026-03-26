const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('domushr_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('domushr_token', token);
    } else {
      localStorage.removeItem('domushr_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 — token expired
    if (response.status === 401) {
      this.setToken(null);
      localStorage.removeItem('domushr_user');
      window.location.href = '/';
      throw new Error('Sesi telah berakhir. Silakan login ulang.');
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      if (!response.ok) {
        throw new Error('Gagal memproses data dari server. Pastikan VITE_API_URL telah diatur di Vercel menuju URL backend Railway Anda.');
      }
      throw new Error('Terjadi kesalahan format response dari server API.');
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  get(path) {
    return this.request(path, { method: 'GET' });
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }

  // Special method for file uploads
  async upload(path, formData) {
    const url = `${API_BASE}${path}`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Don't set Content-Type — let browser set it with boundary for multipart
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  // Auth methods
  async login(username, password) {
    const data = await this.post('/auth/login', { username, password });
    this.setToken(data.token);
    return data;
  }

  async register(name, username, password) {
    return this.post('/auth/register', { name, username, password });
  }

  async requestPasswordReset(username) {
    return this.request('/password-reset-request', { method: 'POST', body: JSON.stringify({ username }) });
  }
}

const api = new ApiClient();
export default api;
