// ── CampusAI Frontend API Helper ──────────────────────────────
// Shared across student.js, admin.js, librarian.js, alumni.js
// Usage: const data = await api.get('/books'); or api.post('/auth/login', { email, password })

const API_ORIGIN = globalThis.CAMPUSAI_API_ORIGIN
    || (globalThis.location.port === '5000' ? globalThis.location.origin : 'http://localhost:5000');
const API_BASE = `${API_ORIGIN}/api`;

const api = {
    _token() {
        return localStorage.getItem('campusai_token') || '';
    },

    _headers() {
        const h = { 'Content-Type': 'application/json' };
        const t = this._token();
        if (t) h['Authorization'] = `Bearer ${t}`;
        return h;
    },

    async get(path) {
        const res = await fetch(`${API_BASE}${path}`, { headers: this._headers(), credentials: 'include' });
        return res.json();
    },

    async post(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST', headers: this._headers(), body: JSON.stringify(body), credentials: 'include'
        });
        return res.json();
    },

    async put(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT', headers: this._headers(), body: JSON.stringify(body), credentials: 'include'
        });
        return res.json();
    },

    async del(path) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE', headers: this._headers(), credentials: 'include'
        });
        return res.json();
    },

    async upload(path, formData) {
        const h = {};
        const t = this._token();
        if (t) h['Authorization'] = `Bearer ${t}`;
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST', headers: h, body: formData, credentials: 'include'
        });
        return res.json();
    },

    // Auth helpers
    saveLogin(data) {
        localStorage.setItem('campusai_token', data.token);
        localStorage.setItem('campusai_user', JSON.stringify(data.user));
    },

    getUser() {
        try { return JSON.parse(localStorage.getItem('campusai_user')); } catch { return null; }
    },

    isLoggedIn() {
        return !!this._token();
    },

    async logout() {
        try { await this.post('/auth/logout', {}); } catch { }
        localStorage.removeItem('campusai_token');
        localStorage.removeItem('campusai_user');
        globalThis.location.href = '/index.html';
    }
};
