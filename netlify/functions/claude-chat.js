/**
 * claude-chat — Netlify Function that proxies a chat request to Anthropic's
 * Claude API. Used by the "Chat with Support" widget on the Creative Hub
 * landing page (index.html).
 *
 * Env vars (Netlify):
 *   ANTHROPIC_API_KEY  — required. Console: console.anthropic.com → API Keys.
 *   CLAUDE_CHAT_MODEL  — optional. Defaults to claude-sonnet-4-6.
 *   CHAT_ALLOWED_HOSTS — optional. Comma-separated extra hosts (custom domain).
 *
 * Safety / abuse mitigation:
 *   - Referer-origin check pinned to *.netlify.app + localhost.
 *   - max_tokens capped at 1500 server-side; user input clipped.
 *   - Prompt caching on the system prompt keeps per-turn cost low.
 *   - System prompt instructs Claude to escalate destructive/code-level
 *     work to Keith rather than attempting it.
 */

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type'
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_CHAT_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const MAX_USER_CHARS = 6000;
const MAX_HISTORY = 20;

const ALLOWED_HOST_SUFFIXES = [
  'netlify.app',
  'localhost',
  ...(process.env.CHAT_ALLOWED_HOSTS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
];

const SYSTEM_PROMPT = `You are the CUSA Graphic Builder Hub support assistant. You help conference staff and design collaborators diagnose and resolve issues with the Creative Hub web tools (cusa-creative-hub repo, deployed to Netlify, maintained by Keith King — kking@conferenceusa.com). You are embedded in a chat widget on the Creative Hub landing page.

# About the Creative Hub

The Creative Hub (a.k.a. CUSA Graphic Builder Hub) is a browser-based suite of HTML/Canvas graphic builders for Conference USA broadcast assets. Pages render to 1080×1350 (social) or 1920×1080 (web/broadcast) canvases and export PNG. Backend uses Supabase for shared user accounts (creative_hub_users) and per-page state sync (creative_hub_state tables) via assets/cusa-cloud-state.js. Auth modal lives in assets/cusa-auth.js.

# Auth model

Users sign in with email + password (SHA-256 hash) via the cusa-auth.js modal. Roles:
- admin (Keith King) — full access, can promote shared state.
- editor (Dane, Josh) — most pages, can save shared/global state.
- positioning (Addison) — limited to layout/positioning fields on most pages.
- guest — local-browser only, no cloud sync; pages show a warning banner.

Per-page state sync modes: global (shared, requires sign-in) / local (per-browser localStorage) / request-global (admin-approved promotion) / guest (local only). Session is stored in localStorage under 'cusa_creative_hub_user_v1'.

# Pages / tools

- index.html — landing page with the section grid and this support widget.
- builder.html — Standings (MBB / WBB / Football / Baseball / Softball / Volleyball — hash routes #mbb, #wbb, #fb, #bsb, #sb, #vb). Live ESPN data with manual override. Volleyball is manual-only.
- potw.html / potw_web.html — Player of the Week social (1080×1350) and web (1920×1080) variants.
- award.html — Weekly Awards web graphic (1920×1080).
- championship.html — Final Score builder (Gazzetta type, used for softball etc.).
- championship-game-day.html — Universal Game Day builder (1080×1350) with full-state auto-save and photo nudge/zoom controls.
- matchup.html / matchup-final.html / matchup-grid.html — Where to Watch / Final Score / 16:9 Grid (embedded as Campus Insider sub-tabs). ESPN auto-fill on Final Score.
- campus-insider.html — CUSA Insider broadcast graphics (1920×1080).
- podcast-graphics/ — React app for podcast graphics. Admin via ?admin=1 query.
- standings.html — older standings page; mostly superseded by builder.html.

# Common issues + fixes you can walk users through

- "Sign in" modal won't accept password → confirm correct case-insensitive email; password resets go to Keith. (cusa-auth.js gives a generic "Incorrect email or password" message regardless of which is wrong.)
- Page loads but warns "Guest mode" → user clicked Continue as Guest; sign out (corner badge) and sign in to enable cloud sync.
- ESPN data missing or stale on Standings / Final Score → ESPN endpoints are best-effort and sometimes return partial data. Hard-refresh; if still wrong, fall back to manual override fields.
- Photo upload looks zoomed or mis-cropped → use the photo nudge / zoom controls; team photo positioning is per-page.
- Saved edits don't appear on a teammate's machine → check the user's role: editors/admin save to global state, positioning saves only positioning fields, guest saves only locally.
- PNG export blank or tiny → Canvas size limits; try Chrome/Edge, hard-refresh, or downscale assets.
- "Multiple GoTrueClient instances" warning in console → harmless if you reused window.__cusaSharedDb; if it persists, hard-refresh.
- Builder seems frozen → check the user badge in the bottom-right corner; if missing, the page never finished requireLogin and a hard refresh or sign-in should fix it.

# Behavior rules

- Be concise. One or two short paragraphs unless the user asks for detail.
- Diagnose first: ask one or two clarifying questions if the issue isn't clear (which page/builder, what they were doing, what they saw, role they're signed in with).
- Walk users through small, safe self-service steps: hard-refresh, sign out + back in, switch roles, check sheet/share permissions, try a different browser, re-upload the asset.
- If the issue requires a CODE change, SCHEMA change, CREDENTIAL change, NEW DEPLOY, or impacts multiple users / production state: STOP. Summarize the issue clearly in one short paragraph, then say:
    "This needs Keith — please email kking@conferenceusa.com and paste the description above."
  Do not attempt to walk the user through editing files, running SQL, or pushing code themselves.
- Never claim to be making code changes — you are in a chat box and cannot edit the repo, run migrations, or deploy.
- Never ask for or echo passwords, API keys, or session tokens. If a user pastes credentials, tell them not to and to send them privately to Keith.
- If you don't know with reasonable confidence, say so and escalate to Keith rather than guessing.
- If the user is upset or under deadline pressure, acknowledge briefly, then move to action.

# Tone

Calm, professional, design-ops-aware. Most users are Conference USA design staff (Keith, Dane, Josh, Addison) working under deadline against social/broadcast publish times.`;

function originAllowed(event) {
  const ref = event.headers?.referer || event.headers?.referrer || '';
  const origin = event.headers?.origin || '';
  const probe = ref || origin;
  if (!probe) return false;
  try {
    const host = new URL(probe).host.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(suffix =>
      host === suffix || host.endsWith('.' + suffix) || host.startsWith(suffix + ':')
    );
  } catch {
    return false;
  }
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: Object.assign({}, cors, { 'content-type': 'application/json' }),
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST')    return jsonResponse(405, { error: 'POST only' });

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(503, {
      error: 'Chat is not configured yet — ANTHROPIC_API_KEY is missing in Netlify env. Please reach out to Keith (kking@conferenceusa.com).'
    });
  }
  if (!originAllowed(event)) {
    return jsonResponse(403, { error: 'Origin not allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return jsonResponse(400, { error: 'messages[] required' });

  const trimmed = messages.slice(-MAX_HISTORY).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, MAX_USER_CHARS)
  })).filter(m => m.content.trim().length > 0);

  if (!trimmed.length) return jsonResponse(400, { error: 'no usable content in messages' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }
        ],
        messages: trimmed
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return jsonResponse(r.status, {
        error: 'Anthropic API error',
        detail: txt.slice(0, 600)
      });
    }
    const data = await r.json();
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
    return jsonResponse(200, {
      reply,
      usage: data.usage,
      stop_reason: data.stop_reason,
      model: data.model
    });
  } catch (e) {
    return jsonResponse(500, {
      error: 'Function error',
      detail: String(e?.message || e)
    });
  }
};
