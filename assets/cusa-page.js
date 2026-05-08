// CUSA Creative Hub — page bootstrap. Wires login, permission resolution,
// global vs local state sync, and the per-user mode banner into each
// editor page.
//
//   cusaPage.hookPersist({ pageKey, stateKey })
//     wraps window.persistState. Every persistState call mirrors the new
//     state to the right Supabase table based on the signed-in user's
//     mode for this page (global / local / request-global / guest).
//
//   await cusaPage.boot({ pageKey, stateKey })
//     pops the login modal if needed, resolves permissions, loads the
//     correct state (global for everyone; local overrides for local-mode
//     users with their own per-user row), renders a mode banner. Triggers
//     a one-time reload if the page's localStorage diverged from cloud
//     so the existing restoreState() picks up clean.
//
// Skipped when ?embedded=1 is present (matchup-grid iframes — the parent
// owns auth + sync for the whole grid).
(function () {
  function isEmbedded() {
    try { return new URLSearchParams(location.search).get('embedded') === '1'; }
    catch (_) { return false; }
  }

  // ── Permission matrix ─────────────────────────────────────────────────
  // mode:
  //   'global'         — saves to creative_hub_global_state (shared).
  //   'local'          — saves to creative_hub_state (per-user).
  //   'request-global' — saves locally; user can submit a Save Request
  //                       for an admin to promote to global.
  //   'guest'          — localStorage only, no Supabase writes.
  //
  // scope (only meaningful where the page implements UI gating):
  //   'all', 'content', 'positioning'.
  const PAGE_PERMS = {
    'standings': {
      'kking@conferenceusa.com':     { mode: 'global', scope: 'all' },
      'afranklin@conferenceusa.com': { mode: 'global', scope: 'positioning' },
      'dlewis@conferenceusa.com':    { mode: 'global', scope: 'content' },
    },
    'potw': {
      'kking@conferenceusa.com':     { mode: 'global', scope: 'all' },
      'afranklin@conferenceusa.com': { mode: 'global', scope: 'all' },
      'dlewis@conferenceusa.com':    { mode: 'local',  scope: 'all' },
      'jyonis@conferenceusa.com':    { mode: 'local',  scope: 'all' },
    },
    'awards': {
      'kking@conferenceusa.com':     { mode: 'global', scope: 'all' },
      'afranklin@conferenceusa.com': { mode: 'global', scope: 'all' },
      'jyonis@conferenceusa.com':    { mode: 'local',  scope: 'all' },
    },
    'championship': {
      'kking@conferenceusa.com':     { mode: 'global',         scope: 'all' },
      'afranklin@conferenceusa.com': { mode: 'global',         scope: 'all' },
      'jyonis@conferenceusa.com':    { mode: 'request-global', scope: 'all' },
    },
    // matchup, matchup-final, matchup-grid all share these perms.
    'cusa-insider': {
      'kking@conferenceusa.com':     { mode: 'global', scope: 'all' },
      'afranklin@conferenceusa.com': { mode: 'global', scope: 'all' },
      'dlewis@conferenceusa.com':    { mode: 'local',  scope: 'all' },
      'jyonis@conferenceusa.com':    { mode: 'local',  scope: 'all' },
    },
  };

  // Default for signed-in users without an explicit page entry — local
  // save, with a warning banner so they know nothing syncs to the team.
  const DEFAULT_PERM = { mode: 'local', scope: 'all' };

  function pageGroupOf(pageKey) {
    if (!pageKey) return null;
    if (pageKey === 'matchup' || pageKey === 'matchup-final' || pageKey === 'matchup-grid') return 'cusa-insider';
    if (pageKey === 'championship' || pageKey === 'championship-game-day')                  return 'championship';
    if (pageKey === 'standings') return 'standings';
    if (pageKey === 'potw')      return 'potw';
    if (pageKey === 'award' || pageKey === 'awards') return 'awards';
    return pageKey;
  }

  function resolvePerm(pageKey, user) {
    if (!user) return { mode: 'guest', scope: 'all' };
    if (user.role === 'guest' || user.email === 'guest') return { mode: 'guest', scope: 'all' };
    const group = pageGroupOf(pageKey);
    const map = PAGE_PERMS[group];
    if (map && map[user.email]) return map[user.email];
    return DEFAULT_PERM;
  }

  // ── Mode banner — top-of-page strip showing current save mode + warning.
  function renderModeBanner(pageKey, perm) {
    const existing = document.getElementById('cusa-mode-banner');
    if (existing) existing.remove();
    if (!perm) return;

    let bg, fg, label, hint;
    if (perm.mode === 'global') {
      bg = '#1f6c33'; fg = '#fff';
      label = 'GLOBAL SAVE';
      hint  = 'Edits sync to the team — visible to everyone.';
    } else if (perm.mode === 'local') {
      bg = '#9a6700'; fg = '#fff';
      label = 'LOCAL SAVE';
      hint  = '⚠ Edits save to your account only — the team will not see them.';
    } else if (perm.mode === 'request-global') {
      bg = '#1f4f8c'; fg = '#fff';
      label = 'LOCAL SAVE · CAN REQUEST GLOBAL';
      hint  = 'Edits save to your account. Use "Request Global Save" to submit them for an admin to promote.';
    } else if (perm.mode === 'guest') {
      bg = '#992525'; fg = '#fff';
      label = 'GUEST · BROWSER ONLY';
      hint  = '⚠ Edits save only to this browser. They will be lost if you clear cache and never sync to the team.';
    } else {
      return;
    }

    const bar = document.createElement('div');
    bar.id = 'cusa-mode-banner';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:' + bg + ';color:' + fg +
      ';font-family:Segoe UI,Helvetica Neue,sans-serif;font-size:11px;padding:5px 12px;display:flex;gap:12px;align-items:center;letter-spacing:0.5px;line-height:1.3';
    bar.innerHTML =
      '<strong style="letter-spacing:1px">' + label + '</strong>' +
      '<span style="opacity:0.9;flex:1">' + hint + '</span>' +
      (perm.mode === 'request-global'
        ? '<button id="cusa-request-global-btn" style="background:#fff;color:#1f4f8c;border:none;padding:4px 10px;border-radius:4px;font-weight:600;font-size:11px;cursor:pointer;font-family:inherit">Request Global Save</button>'
        : '') +
      '<a href="#" id="cusa-banner-signout" style="color:' + fg + ';text-decoration:underline;opacity:0.85">sign out</a>';
    document.body.appendChild(bar);

    document.getElementById('cusa-banner-signout').addEventListener('click', (e) => {
      e.preventDefault();
      window.cusaAuth.signOut();
    });
    if (perm.mode === 'request-global') {
      document.getElementById('cusa-request-global-btn').addEventListener('click', async () => {
        await requestGlobalSave(pageKey);
      });
    }
  }

  async function requestGlobalSave(pageKey) {
    const stateKey = window.__cusaPageStateKey;
    if (!stateKey) { alert('Save snapshot unavailable.'); return; }
    let stateObj = null;
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) stateObj = JSON.parse(raw);
    } catch (_) {}
    if (!stateObj) { alert('Nothing to submit yet — make at least one edit first.'); return; }
    const note = prompt('Optional note for the admin (what this save is for):');
    if (note === null) return;
    const res = await window.cusaCloudState.submitSaveRequest(pageKey, stateObj, note);
    if (res.ok) alert('Save request submitted. An admin will review and promote it to global.');
    else        alert('Submit failed: ' + (res.error || 'unknown error'));
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  async function boot({ pageKey, stateKey }) {
    if (isEmbedded()) return;
    await window.cusaAuth.requireLogin();
    const u = window.cusaAuth.currentUser();
    const perm = resolvePerm(pageKey, u);

    // Stash for the request-global button to read on click.
    window.__cusaPageStateKey = stateKey;
    window.__cusaPagePageKey  = pageKey;
    window.__cusaPagePerm     = perm;

    renderModeBanner(pageKey, perm);

    // Guest: localStorage only, skip Supabase entirely.
    if (perm.mode === 'guest') return;

    try {
      // Everyone reads global first — it's the team-canonical version.
      const globalRes = await window.cusaCloudState.loadGlobalState(pageKey);
      let chosenState = globalRes ? globalRes.state : null;

      // Local-mode users: their personal row overrides global if it exists.
      if (perm.mode === 'local' || perm.mode === 'request-global') {
        const localRes = await window.cusaCloudState.loadState(pageKey);
        if (localRes) chosenState = localRes.state;
      }

      if (chosenState) {
        const remoteStr = JSON.stringify(chosenState);
        const localStr  = localStorage.getItem(stateKey);
        if (localStr !== remoteStr) {
          localStorage.setItem(stateKey, remoteStr);
          location.reload();
          await new Promise(() => {});
          return;
        }
      } else {
        // No cloud row yet — seed it from current localStorage.
        const localStr = localStorage.getItem(stateKey);
        if (localStr) {
          try {
            const obj = JSON.parse(localStr);
            if (perm.mode === 'global') {
              await window.cusaCloudState.saveGlobalStateNow(pageKey, obj);
            } else if (perm.mode === 'local' || perm.mode === 'request-global') {
              await window.cusaCloudState.saveStateNow(pageKey, obj);
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('cusaPage.boot: cloud sync skipped:', e && e.message ? e.message : e);
    }
  }

  // ── hookPersist — wraps window.persistState to mirror to the right table.
  function hookPersist({ pageKey, stateKey }) {
    if (isEmbedded()) return;
    const orig = window.persistState;
    if (typeof orig !== 'function') {
      console.warn('cusaPage.hookPersist: window.persistState not found.');
      return;
    }
    window.persistState = function () {
      orig.apply(this, arguments);
      try {
        const raw = localStorage.getItem(stateKey);
        if (!raw) return;
        const obj = JSON.parse(raw);
        const u = window.cusaAuth && window.cusaAuth.currentUser();
        const perm = resolvePerm(pageKey, u);
        if (perm.mode === 'guest')  return;
        if (perm.mode === 'global') window.cusaCloudState.saveGlobalState(pageKey, obj);
        else                        window.cusaCloudState.saveState(pageKey, obj);
      } catch (_) {}
    };
  }

  // Lighter-weight variant of boot() for pages that don't have any
  // persistent editor state to sync — they still need the login modal
  // and the mode banner so users see who they are + their save scope.
  // Used by potw.html / award.html.
  async function gateOnly({ pageKey }) {
    if (isEmbedded()) return;
    await window.cusaAuth.requireLogin();
    const u = window.cusaAuth.currentUser();
    const perm = resolvePerm(pageKey, u);
    window.__cusaPagePerm = perm;
    renderModeBanner(pageKey, perm);
  }

  window.cusaPage = { boot, hookPersist, resolvePerm, pageGroupOf, gateOnly };
})();
