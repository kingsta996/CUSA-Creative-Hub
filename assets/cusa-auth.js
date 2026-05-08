// CUSA Creative Hub — login modal + session.
// Looks up creative_hub_users in Supabase, SHA-256 password match, then
// stores a small user object in localStorage so subsequent page loads
// skip the modal.
//
// Exposes window.cusaAuth = { currentUser, signOut, requireLogin, renderUserBadge }.
(function () {
  const SESSION_KEY = 'cusa_creative_hub_user_v1';
  let _user = null;
  let _db = null;

  function db() {
    if (_db) return _db;
    if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      _db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return _db;
  }

  async function hashPw(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) _user = JSON.parse(raw);
    } catch (_) {}
    return _user;
  }

  function currentUser() { return _user || loadFromStorage(); }

  function signOut() {
    _user = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    location.reload();
  }

  async function tryLogin(email, password) {
    const d = db();
    if (!d) throw new Error('Supabase client not configured.');
    const e = (email || '').trim().toLowerCase();
    const h = await hashPw(password || '');
    const { data, error } = await d.from('creative_hub_users')
      .select('email, pw_hash, display_name, is_active, role')
      .eq('email', e)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.is_active || data.pw_hash !== h) {
      throw new Error('Incorrect email or password.');
    }
    _user = {
      email: data.email,
      display_name: data.display_name || data.email,
      role: data.role || 'editor',
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(_user)); } catch (_) {}
    return _user;
  }

  // Sign in as a generic guest. Stays in-browser only — no Supabase user
  // is created. Pages will treat this user as 'guest' mode → localStorage
  // saves only, no cloud sync, with a warning banner.
  function signInAsGuest() {
    _user = { email: 'guest', display_name: 'Guest', role: 'guest' };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(_user)); } catch (_) {}
    return _user;
  }

  function renderModal() {
    if (document.getElementById('cusa-login-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cusa-login-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Segoe UI,Helvetica Neue,sans-serif';
    overlay.innerHTML =
      '<div style="background:#fff;width:340px;padding:28px;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.3)">' +
        '<h2 style="margin:0 0 4px;font-size:18px;color:#00263A">CUSA Creative Hub</h2>' +
        '<div style="font-size:12px;color:#666;margin-bottom:18px">Sign in to save your edits to the cloud.</div>' +
        '<input id="cusa-login-email" type="email" placeholder="Email" autocomplete="username" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:8px;font-family:inherit"/>' +
        '<input id="cusa-login-pw" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:8px;font-family:inherit"/>' +
        '<div id="cusa-login-err" style="display:none;color:#c00;font-size:12px;margin-bottom:8px"></div>' +
        '<button id="cusa-login-submit" style="width:100%;padding:10px;background:#00263A;color:#fff;border:none;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit">Sign in</button>' +
        '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 8px;color:#999;font-size:11px"><div style="flex:1;height:1px;background:#eee"></div>or<div style="flex:1;height:1px;background:#eee"></div></div>' +
        '<button id="cusa-login-guest" style="width:100%;padding:9px;background:#fff;color:#00263A;border:1px solid #00263A;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit">Continue as Guest</button>' +
        '<div style="font-size:10px;color:#888;margin-top:6px;line-height:1.4">Guest mode saves edits to <strong>this browser only</strong>. They will not sync to the team and will be lost if you clear your cache.</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const onSubmit = async () => {
      const email = document.getElementById('cusa-login-email').value;
      const pw    = document.getElementById('cusa-login-pw').value;
      const err   = document.getElementById('cusa-login-err');
      err.style.display = 'none';
      const btn = document.getElementById('cusa-login-submit');
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        await tryLogin(email, pw);
        overlay.remove();
        if (typeof window.__cusaLoginResolve === 'function') {
          const r = window.__cusaLoginResolve;
          delete window.__cusaLoginResolve;
          r(_user);
        }
      } catch (e) {
        err.textContent = (e && e.message) ? e.message : 'Login failed.';
        err.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    };
    document.getElementById('cusa-login-submit').addEventListener('click', onSubmit);
    document.getElementById('cusa-login-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') onSubmit(); });
    document.getElementById('cusa-login-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('cusa-login-pw').focus(); });
    document.getElementById('cusa-login-guest').addEventListener('click', () => {
      signInAsGuest();
      overlay.remove();
      if (typeof window.__cusaLoginResolve === 'function') {
        const r = window.__cusaLoginResolve;
        delete window.__cusaLoginResolve;
        r(_user);
      }
    });
    setTimeout(() => document.getElementById('cusa-login-email').focus(), 80);
  }

  // If Supabase isn't configured, log a warning and resolve with a synthetic
  // local-dev user so the page still works.
  async function requireLogin() {
    const u = currentUser();
    if (u) return u;
    if (!db()) {
      console.warn('cusaAuth: Supabase not configured (config.js empty?). Skipping login gate for local dev.');
      _user = { email: 'local-dev@cusa', display_name: 'Local dev' };
      return _user;
    }
    return new Promise((resolve) => {
      window.__cusaLoginResolve = resolve;
      // Wait for body if called too early.
      if (document.body) renderModal();
      else document.addEventListener('DOMContentLoaded', renderModal, { once: true });
    });
  }

  function renderUserBadge() {
    if (document.getElementById('cusa-user-badge')) return;
    const u = currentUser();
    if (!u) return;
    const badge = document.createElement('div');
    badge.id = 'cusa-user-badge';
    badge.style.cssText = 'position:fixed;bottom:8px;right:10px;font-family:Segoe UI,sans-serif;font-size:11px;color:#fff;background:rgba(0,38,58,0.85);padding:5px 10px;border-radius:14px;z-index:9999;display:flex;gap:8px;align-items:center;pointer-events:auto';
    badge.innerHTML = '<span>' + (u.display_name || u.email) + '</span><a href="#" id="cusa-signout" style="color:#bcd;text-decoration:underline">sign out</a>';
    document.body.appendChild(badge);
    document.getElementById('cusa-signout').addEventListener('click', (e) => { e.preventDefault(); signOut(); });
  }

  window.cusaAuth = { currentUser, signOut, requireLogin, renderUserBadge, signInAsGuest };
})();
