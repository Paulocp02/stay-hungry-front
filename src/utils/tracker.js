// src/utils/tracker.js
// Tracker sin depender del header Authorization (beacon/fetch keepalive)
// Enviamos userId y rol en el body.

const API = 'https://stay-hungry-api.onrender.com/api/analytics/track';
const LS_SESSION_KEY = 'shg_session_id';

function getSessionId() {
  let sid = localStorage.getItem(LS_SESSION_KEY);
  if (!sid) {
    sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(LS_SESSION_KEY, sid);
  }
  return sid;
}

function getUserFromLS() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return { id: u?.id ?? u?.userId ?? u?.usuario_id ?? null, rol: u?.rol ?? u?.role ?? null };
  } catch {
    return null;
  }
}

async function postJSON(url, body) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // sin Authorization
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch (_) {}
}

function beacon(url, body) {
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (!navigator.sendBeacon(url, blob)) {
      // si falla beacon, degradamos a fetch
      postJSON(url, body);
    }
  } catch {
    postJSON(url, body);
  }
}

export default class Tracker {
  constructor(getUser) {
    // getUser es opcional; si no viene, leemos de localStorage
    this.getUser = typeof getUser === 'function' ? getUser : getUserFromLS;
    this.sessionId = getSessionId();
    this.heartbeatMs = 15000; // 15s
    this.heartbeatTimer = null;
    this.lastFocusAt = null;
    this._lastPVSentFor = null;
  }

  _payload(base = {}) {
    const u = this.getUser?.() || {};
    return {
      sessionId: this.sessionId,
      userId: u.id ?? null,
      rol: u.rol ?? null,
      route: window.location.pathname,
      ...base,
    };
  }

  start() {
    this._onFocus = () => {
      this.lastFocusAt = Date.now();
      postJSON(API, this._payload({ type: 'focus' }));
    };

    this._onBlur = () => {
      const now = Date.now();
      const dur = this.lastFocusAt ? now - this.lastFocusAt : 0;
      this.lastFocusAt = null;
      beacon(API, this._payload({ type: 'blur', durationMs: Math.max(0, dur) }));
    };

    window.addEventListener('focus', this._onFocus);
    window.addEventListener('blur', this._onBlur);

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const dur = this.lastFocusAt ? now - this.lastFocusAt : 0;
      postJSON(API, this._payload({ type: 'heartbeat', durationMs: Math.max(0, dur) }));
      this.lastFocusAt = now;
    }, this.heartbeatMs);

    // marca inicial
    this._onFocus();
    this.pageView(window.location.pathname);
  }

  stop() {
    window.removeEventListener('focus', this._onFocus);
    window.removeEventListener('blur', this._onBlur);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    const now = Date.now();
    const dur = this.lastFocusAt ? now - this.lastFocusAt : 0;
    beacon(API, this._payload({ type: 'unload', durationMs: Math.max(0, dur) }));
  }

  pageView(pathname) {
    if (!pathname) return;
    if (this._lastPVSentFor === pathname) return;
    this._lastPVSentFor = pathname;
    postJSON(API, this._payload({ type: 'page_view', route: pathname }));
  }
}
