// CUSA Creative Hub — per-user editor state sync.
// saveState(pageKey, state) is debounced (rapid edits collapse into one
// network call). loadState(pageKey) returns { state, updatedAt } or null.
// All ops require window.cusaAuth.currentUser() to be set.
//
// Exposes window.cusaCloudState = { saveState, loadState, saveStateNow }.
(function () {
  let _db = null;
  function db() {
    if (_db) return _db;
    if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      _db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return _db;
  }

  const _timers = {};   // pageKey -> timeout id
  const _queue  = {};   // pageKey -> latest state pending save
  const SAVE_DEBOUNCE_MS = 800;

  async function saveStateNow(pageKey, state) {
    const d = db();
    const u = window.cusaAuth && window.cusaAuth.currentUser();
    if (!d || !u) return false;
    try {
      const { error } = await d.from('creative_hub_state').upsert({
        email: u.email,
        page_key: pageKey,
        state: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email,page_key' });
      if (error) { console.warn('cloud save failed:', error.message || error); return false; }
      return true;
    } catch (e) {
      console.warn('cloud save error:', e && e.message ? e.message : e);
      return false;
    }
  }

  function saveState(pageKey, state) {
    _queue[pageKey] = state;
    if (_timers[pageKey]) clearTimeout(_timers[pageKey]);
    _timers[pageKey] = setTimeout(async () => {
      const s = _queue[pageKey];
      delete _queue[pageKey];
      delete _timers[pageKey];
      await saveStateNow(pageKey, s);
    }, SAVE_DEBOUNCE_MS);
  }

  async function loadState(pageKey) {
    const d = db();
    const u = window.cusaAuth && window.cusaAuth.currentUser();
    if (!d || !u) return null;
    try {
      const { data, error } = await d.from('creative_hub_state')
        .select('state, updated_at')
        .eq('email', u.email)
        .eq('page_key', pageKey)
        .maybeSingle();
      if (error) { console.warn('cloud load failed:', error.message || error); return null; }
      if (!data) return null;
      return { state: data.state, updatedAt: data.updated_at };
    } catch (e) {
      console.warn('cloud load error:', e && e.message ? e.message : e);
      return null;
    }
  }

  // On page hide / pagehide, flush any pending save synchronously via sendBeacon
  // so a user closing the tab right after editing doesn't lose the last debounced
  // save. Best-effort: Supabase REST insert via beacon; failures are silent.
  function flushPending() {
    const d = db();
    const u = window.cusaAuth && window.cusaAuth.currentUser();
    if (!d || !u) return;
    Object.keys(_queue).forEach((pageKey) => {
      const state = _queue[pageKey];
      if (!state) return;
      // Direct REST upsert via fetch with keepalive (sendBeacon doesn't allow
      // custom headers needed for Supabase auth).
      const url = window.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/creative_hub_state?on_conflict=email,page_key';
      const body = JSON.stringify({
        email: u.email, page_key: pageKey, state: state, updated_at: new Date().toISOString(),
      });
      try {
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: {
            'apikey': window.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body,
        });
      } catch (_) {}
    });
  }
  window.addEventListener('pagehide', flushPending);
  window.addEventListener('beforeunload', flushPending);

  // ── Global (shared) state — one row per page in creative_hub_global_state.
  //    Used by users whose permission matrix entry says mode='global' for
  //    the page. All clients READ from this table on page load so they see
  //    the team-canonical version regardless of their own save mode.
  const _globalTimers = {};
  const _globalQueue  = {};

  async function saveGlobalStateNow(pageKey, state) {
    const d = db();
    const u = window.cusaAuth && window.cusaAuth.currentUser();
    if (!d || !u) return false;
    try {
      const { error } = await d.from('creative_hub_global_state').upsert({
        page_key: pageKey,
        state: state,
        updated_at: new Date().toISOString(),
        updated_by_email: u.email,
      }, { onConflict: 'page_key' });
      if (error) { console.warn('global save failed:', error.message || error); return false; }
      return true;
    } catch (e) { console.warn('global save error:', e && e.message ? e.message : e); return false; }
  }

  function saveGlobalState(pageKey, state) {
    _globalQueue[pageKey] = state;
    if (_globalTimers[pageKey]) clearTimeout(_globalTimers[pageKey]);
    _globalTimers[pageKey] = setTimeout(async () => {
      const s = _globalQueue[pageKey];
      delete _globalQueue[pageKey];
      delete _globalTimers[pageKey];
      await saveGlobalStateNow(pageKey, s);
    }, SAVE_DEBOUNCE_MS);
  }

  async function loadGlobalState(pageKey) {
    const d = db();
    if (!d) return null;
    try {
      const { data, error } = await d.from('creative_hub_global_state')
        .select('state, updated_at, updated_by_email')
        .eq('page_key', pageKey)
        .maybeSingle();
      if (error) { console.warn('global load failed:', error.message || error); return null; }
      if (!data) return null;
      return { state: data.state, updatedAt: data.updated_at, updatedBy: data.updated_by_email };
    } catch (e) { console.warn('global load error:', e && e.message ? e.message : e); return null; }
  }

  // ── Save promotion request — for users in 'request-global' mode (Josh on
  //    Championship). Submits a snapshot of their local state for Keith to
  //    review + promote in the override tool.
  async function submitSaveRequest(pageKey, state, note) {
    const d = db();
    const u = window.cusaAuth && window.cusaAuth.currentUser();
    if (!d || !u) return { ok: false, error: 'Not signed in.' };
    try {
      const { error } = await d.from('creative_hub_save_requests').insert({
        page_key: pageKey,
        requester_email: u.email,
        state: state,
        note: note || null,
      });
      if (error) return { ok: false, error: error.message || String(error) };
      return { ok: true };
    } catch (e) { return { ok: false, error: e && e.message ? e.message : String(e) }; }
  }

  window.cusaCloudState = {
    saveState, loadState, saveStateNow,
    saveGlobalState, loadGlobalState, saveGlobalStateNow,
    submitSaveRequest,
  };
})();
