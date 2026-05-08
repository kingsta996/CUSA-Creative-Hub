// CUSA Creative Hub — page bootstrap. Wires login + cloud-state sync into
// each editor page with two calls:
//   cusaPage.hookPersist({ pageKey, stateKey })
//     wraps window.persistState so every localStorage save is also queued
//     to Supabase (debounced via cusaCloudState).
//   await cusaPage.boot({ pageKey, stateKey })
//     pops the login modal if needed, pulls cloud state into localStorage,
//     and reloads the page once if cloud differs from local so the page's
//     existing restoreState() picks up the synced data.
//
// Skipped entirely when ?embedded=1 is present (matchup-grid iframes —
// the parent page handles auth + cloud sync for the whole grid).
(function () {
  function isEmbedded() {
    try { return new URLSearchParams(location.search).get('embedded') === '1'; }
    catch (_) { return false; }
  }

  async function boot({ pageKey, stateKey }) {
    if (isEmbedded()) return; // parent handles auth
    await window.cusaAuth.requireLogin();
    try {
      const remote = await window.cusaCloudState.loadState(pageKey);
      if (remote) {
        const remoteStr = JSON.stringify(remote.state);
        const localStr  = localStorage.getItem(stateKey);
        if (localStr !== remoteStr) {
          localStorage.setItem(stateKey, remoteStr);
          location.reload();
          // Block forever — we're reloading.
          await new Promise(() => {});
          return;
        }
      } else {
        // No cloud row yet for this user/page — push current local state up
        // so the row exists and future devices can pull it.
        const localStr = localStorage.getItem(stateKey);
        if (localStr) {
          try { await window.cusaCloudState.saveStateNow(pageKey, JSON.parse(localStr)); }
          catch (_) {}
        }
      }
    } catch (e) {
      console.warn('cusaPage.boot: cloud sync skipped:', e && e.message ? e.message : e);
    }
    window.cusaAuth.renderUserBadge();
  }

  function hookPersist({ pageKey, stateKey }) {
    if (isEmbedded()) return;
    const orig = window.persistState;
    if (typeof orig !== 'function') {
      console.warn('cusaPage.hookPersist: window.persistState not found — call after the page defines it.');
      return;
    }
    window.persistState = function () {
      orig.apply(this, arguments);
      try {
        const raw = localStorage.getItem(stateKey);
        if (raw && window.cusaCloudState) {
          window.cusaCloudState.saveState(pageKey, JSON.parse(raw));
        }
      } catch (_) {}
    };
  }

  window.cusaPage = { boot, hookPersist };
})();
