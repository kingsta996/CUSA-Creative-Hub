
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), labels/titles are inline-editable,
// and any artboard can be opened in a fullscreen focus overlay (←/→/Esc).
// State persists to a .design-canvas.state.json sidecar via the host
// bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#060f1a',
  grid: 'rgba(255,255,255,0.04)',
  label: 'rgba(255,255,255,0.55)',
  title: '#fff',
  subtitle: 'rgba(255,255,255,0.45)',
  postitBg: 'rgba(235,25,70,0.10)',
  postitText: '#ffd6df',
  font: "'Barlow', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = [
    '.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px;color:#fff}',
    '.dc-editable:focus{background:rgba(235,25,70,0.10);box-shadow:0 0 0 1.5px #EB1946}',
    '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}',
    '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}',
    '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 0 2px #EB1946;transform:scale(1.02)}',
    '.dc-card{transition:box-shadow .15s,transform .15s;border:1px solid rgba(255,255,255,0.08);border-radius:4px;background:#0a1624}',
    '.dc-card *{scrollbar-width:none}',
    '.dc-card *::-webkit-scrollbar{display:none}',
    '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px}',
    '.dc-grip{cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s;color:rgba(255,255,255,0.45)}',
    '.dc-grip:hover{background:rgba(255,255,255,0.08);color:#fff}',
    '.dc-grip:active{cursor:grabbing}',
    '.dc-labeltext{cursor:pointer;border-radius:4px;padding:3px 6px;display:flex;align-items:center;transition:background .12s;font-family:"Barlow Condensed",sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-size:11px}',
    '.dc-labeltext:hover{background:rgba(255,255,255,0.06)}',
    '.dc-expand{position:absolute;bottom:100%;right:0;margin-bottom:5px;z-index:2;opacity:0;transition:opacity .12s,background .12s;',
    '  width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;',
    '  background:transparent;color:rgba(255,255,255,0.55);display:flex;align-items:center;justify-content:center}',
    '.dc-expand:hover{background:rgba(255,255,255,0.10);color:#fff}',
    '[data-dc-slot]:hover .dc-expand{opacity:1}',
  ].join('\n');
  document.head.appendChild(s);
}

const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, focused
// artboard). Order/titles/labels persist to a .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';

function DesignCanvas({ children, minScale, maxScale, style }) {
  const [state, setState] = React.useState({ sections: {}, focus: null });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);

  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE)
      .then((r) => (r.ok ? r.json() : null))
      .then((saved) => {
        if (off || !saved || !saved.sections) return;
        skipNextWrite.current = true;
        setState((s) => ({ ...s, sections: saved.sections }));
      })
      .catch(() => {})
      .finally(() => { didRead.current = true; if (!off) setReady(true); });
    const t = setTimeout(() => { if (!off) setReady(true); }, 150);
    return () => { off = true; clearTimeout(t); };
  }, []);

  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) { skipNextWrite.current = false; return; }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({ sections: state.sections })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {};     // slotId -> { sectionId, artboard }
  const sectionMeta = {};  // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, (sec) => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const srcIds = [];
    React.Children.forEach(sec.props.children, (ab) => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (!aid) return;
      registry[`${sid}/${aid}`] = { sectionId: sid, artboard: ab };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter((k) => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter((k) => !kept.includes(k))],
    };
  });

  const api = React.useMemo(() => ({
    state,
    section: (id) => state.sections[id] || {},
    patchSection: (id, p) => setState((s) => ({
      ...s,
      sections: { ...s.sections, [id]: { ...s.sections[id], ...(typeof p === 'function' ? p(s.sections[id] || {}) : p) } },
    })),
    setFocus: (slotId) => setState((s) => ({ ...s, focus: slotId })),
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') api.setFocus(null); };
    const onPd = (e) => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);

  return (
    <DCCtx.Provider value={api}>
      <DCViewport minScale={minScale} maxScale={maxScale} style={style}>{ready && children}</DCViewport>
      {state.focus && registry[state.focus] && (
        <DCFocusOverlay entry={registry[state.focus]} sectionMeta={sectionMeta} sectionOrder={sectionOrder} />
      )}
    </DCCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({ children, minScale = 0.1, maxScale = 8, style = {} }) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({ x: 0, y: 0, scale: 1 });

  const apply = React.useCallback(() => {
    const { x, y, scale } = tf.current;
    const el = worldRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;

    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = (e) =>
      e.deltaMode !== 0 ||
      (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);

    const onWheel = (e) => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if (e.ctrlKey) {
        // trackpad pinch (or explicit ctrl+wheel)
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = (e) => { e.preventDefault(); isGesturing = true; gsBase = tf.current.scale; };
    const onGestureChange = (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, (gsBase * e.scale) / tf.current.scale);
    };
    const onGestureEnd = (e) => { e.preventDefault(); isGesturing = false; };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = (e) => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || (e.button === 0 && onBg))) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX; drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('gesturestart', onGestureStart, { passive: false });
    vp.addEventListener('gesturechange', onGestureChange, { passive: false });
    vp.addEventListener('gestureend', onGestureEnd, { passive: false });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);

  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return (
    <div
      ref={vpRef}
      className="design-canvas"
      style={{
        height: '100vh', width: '100vw',
        background: DC.bg,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'none',
        position: 'relative',
        fontFamily: DC.font,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        ref={worldRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
          width: 'max-content', minWidth: '100%',
          minHeight: '100%',
          padding: '60px 0 80px',
        }}
      >
        <div style={{ position: 'absolute', inset: -6000, backgroundImage: gridSvg, backgroundSize: '120px 120px', pointerEvents: 'none', zIndex: -1 }} />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({ id, title, subtitle, children, gap = 48 }) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter((c) => c && c.type === DCArtboard);
  const rest = all.filter((c) => !(c && c.type === DCArtboard));
  const srcOrder = artboards.map((a) => a.props.id ?? a.props.label);
  const sec = (ctx && sid && ctx.section(sid)) || {};

  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter((k) => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter((k) => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);

  const byId = Object.fromEntries(artboards.map((a) => [a.props.id ?? a.props.label, a]));

  return (
    <div data-dc-section={sid} style={{ marginBottom: 80, position: 'relative' }}>
      <div style={{ padding: '0 60px 56px' }}>
        <DCEditable tag="div" value={sec.title ?? title}
          onChange={(v) => ctx && sid && ctx.patchSection(sid, { title: v })}
          style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: '#EB1946', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6, display: 'inline-block' }} />
        {subtitle && <div style={{ fontSize: 13, color: DC.subtitle, fontFamily: "'Barlow',sans-serif" }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap, padding: '0 60px', alignItems: 'flex-start', width: 'max-content' }}>
        {order.map((k) => (
          <DCArtboardFrame key={k} sectionId={sid} artboard={byId[k]} order={order}
            label={(sec.labels || {})[k] ?? byId[k].props.label}
            onRename={(v) => ctx && ctx.patchSection(sid, (x) => ({ labels: { ...x.labels, [k]: v } }))}
            onReorder={(next) => ctx && ctx.patchSection(sid, { order: next })}
            onFocus={() => ctx && ctx.setFocus(`${sid}/${k}`)} />
        ))}
      </div>
      {rest}
    </div>
  );
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() { return null; }

function DCArtboardFrame({ sectionId, artboard, label, order, onRename, onReorder, onFocus }) {
  const { id: rawId, label: rawLabel, width = 260, height = 480, children, style = {} } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map((el) => ({ el, id: el.dataset.dcSlot, x: el.getBoundingClientRect().left }));
    const slotXs = homes.map((h) => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');

    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };

    const move = (ev) => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0, best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) { best = d; nearest = i; }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter((k) => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) { h.el.style.transition = 'none'; h.el.style.transform = ''; }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  return (
    <div ref={ref} data-dc-slot={id} style={{ position: 'relative', flexShrink: 0 }}>
      <div className="dc-labelrow" style={{ position: 'absolute', bottom: '100%', left: -4, marginBottom: 4, color: DC.label }}>
        <div className="dc-grip" onPointerDown={onGripDown} title="Drag to reorder">
          <svg width="9" height="13" viewBox="0 0 9 13" fill="currentColor"><circle cx="2" cy="2" r="1.1"/><circle cx="7" cy="2" r="1.1"/><circle cx="2" cy="6.5" r="1.1"/><circle cx="7" cy="6.5" r="1.1"/><circle cx="2" cy="11" r="1.1"/><circle cx="7" cy="11" r="1.1"/></svg>
        </div>
        <div className="dc-labeltext" onClick={onFocus} title="Click to focus">
          <DCEditable value={label} onChange={onRename} onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 15, fontWeight: 500, color: DC.label, lineHeight: 1 }} />
        </div>
      </div>
      <button className="dc-expand" onClick={onFocus} onPointerDown={(e) => e.stopPropagation()} title="Focus">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"/></svg>
      </button>
      <div className="dc-card"
        style={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)', overflow: 'hidden', width, height, background: '#fff', ...style }}>
        {children || <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13, fontFamily: DC.font }}>{id}</div>}
      </div>
    </div>
  );
}

// Inline rename — commits on blur or Enter.
function DCEditable({ value, onChange, style, tag = 'span', onClick }) {
  const T = tag;
  return (
    <T className="dc-editable" contentEditable suppressContentEditableWarning
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => onChange && onChange(e.currentTarget.textContent)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      style={style}>{value}</T>
  );
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({ entry, sectionMeta, sectionOrder }) {
  const ctx = React.useContext(DCCtx);
  const { sectionId, artboard } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);

  const go = (d) => { const n = peers[(idx + d + peers.length) % peers.length]; if (n) ctx.setFocus(`${sectionId}/${n}`); };
  const goSection = (d) => {
    const ns = sectionOrder[(secIdx + d + sectionOrder.length) % sectionOrder.length];
    const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
    if (first) ctx.setFocus(`${ns}/${first}`);
  };

  React.useEffect(() => {
    const k = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); goSection(-1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goSection(1); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  const { width = 260, height = 480, children } = artboard.props;
  const [vp, setVp] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  React.useEffect(() => { const r = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));

  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({ dir, onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ position: 'absolute', top: '50%', [dir]: 28, transform: 'translateY(-50%)',
        border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.9)',
        width: 44, height: 44, borderRadius: 22, fontSize: 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d={dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'} /></svg>
    </button>
  );

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(
    <div onClick={() => ctx.setFocus(null)}
      onWheel={(e) => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(24,20,16,.6)', backdropFilter: 'blur(14px)',
        fontFamily: DC.font, color: '#fff' }}>

      {/* top bar: section dropdown (left) · close (right) */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'flex-start', padding: '16px 20px 0', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDd((o) => !o)}
            style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '6px 8px',
              borderRadius: 6, textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>{meta.title}</span>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ opacity: .7 }}><path d="M2 4l3.5 3.5L9 4"/></svg>
            </span>
            {meta.subtitle && <span style={{ display: 'block', fontSize: 13, opacity: .6, fontWeight: 400, marginTop: 2 }}>{meta.subtitle}</span>}
          </button>
          {ddOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#2a251f', borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,.4)', padding: 4, minWidth: 200, zIndex: 10 }}>
              {sectionOrder.map((sid) => (
                <button key={sid} onClick={() => { setDd(false); const f = sectionMeta[sid].slotIds[0]; if (f) ctx.setFocus(`${sid}/${f}`); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent', color: '#fff',
                    padding: '8px 12px', borderRadius: 5, fontSize: 14, fontWeight: sid === sectionId ? 600 : 400, fontFamily: 'inherit' }}>
                  {sectionMeta[sid].title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => ctx.setFocus(null)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.7)', width: 32, height: 32,
            borderRadius: 16, fontSize: 20, cursor: 'pointer', lineHeight: 1, transition: 'background .12s' }}>×</button>
      </div>

      {/* card centered, label + index below — only the card itself stops
          propagation so any backdrop click (including the margins around
          the card) exits focus */}
      <div
        style={{ position: 'absolute', top: 64, bottom: 56, left: 100, right: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: width * scale, height: height * scale, position: 'relative' }}>
          <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', borderRadius: 2, overflow: 'hidden',
            boxShadow: '0 20px 80px rgba(0,0,0,.4)' }}>
            {children || <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>{aid}</div>}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 500, opacity: .85, textAlign: 'center' }}>
          {(sec.labels || {})[aid] ?? artboard.props.label}
          <span style={{ opacity: .5, marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {peers.length}</span>
        </div>
      </div>

      <Arrow dir="left" onClick={() => go(-1)} />
      <Arrow dir="right" onClick={() => go(1)} />

      {/* dots */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
        {peers.map((p, i) => (
          <button key={p} onClick={() => ctx.setFocus(`${sectionId}/${p}`)}
            style={{ border: 'none', padding: 0, cursor: 'pointer', width: 6, height: 6, borderRadius: 3,
              background: i === idx ? '#fff' : 'rgba(255,255,255,.3)' }} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({ children, top, left, right, bottom, rotate = -2, width = 180 }) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom, width,
      background: DC.postitBg, padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14, lineHeight: 1.4, color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// StackedView — alternate layout for the embedded Hub mode.
// Walks the same DCSection > DCArtboard children but renders them
// in a vertical stack, each artboard scaled to fit the container width
// (preserves native 1920×1080 internal layout via CSS transform).
// Also wires up the #quickNav sidebar in the host page.
// ─────────────────────────────────────────────────────────────
function StackedView({ children, sidePadding = 24 }) {
  const containerRef = React.useRef(null);
  const [cw, setCw] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setCw(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Walk children → flat list of {sectionId, sectionTitle, artId, label, width, height, content}
  const sections = [];
  React.Children.forEach(children, (sec) => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    const sectionTitle = sec.props.title || sid;
    const arts = [];
    React.Children.forEach(sec.props.children, (ab) => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      arts.push({
        id: aid,
        label: ab.props.label || aid,
        width: ab.props.width || 1920,
        height: ab.props.height || 1080,
        content: ab.props.children,
        controls: ab.props.controls,
      });
    });
    sections.push({ id: sid, title: sectionTitle, arts });
  });

  // Build quick-nav into host element (#quickNavList)
  React.useEffect(() => {
    const list = document.getElementById('quickNavList');
    if (!list) return;
    list.innerHTML = '';
    sections.forEach((sec) => {
      const head = document.createElement('div');
      head.className = 'quick-nav-section';
      head.textContent = sec.title;
      list.appendChild(head);
      sec.arts.forEach((a) => {
        const link = document.createElement('a');
        link.className = 'quick-nav-link';
        link.href = `#sv-${sec.id}-${a.id}`;
        link.textContent = a.label;
        link.dataset.target = `sv-${sec.id}-${a.id}`;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const t = document.getElementById(link.dataset.target);
          if (t) t.scrollIntoView({ behavior:'smooth', block:'start' });
        });
        list.appendChild(link);
      });
    });
  }, [JSON.stringify(sections.map(s => [s.id, s.arts.map(a => a.id)]))]);

  // Highlight the currently visible artboard in the quick-nav via IntersectionObserver
  React.useEffect(() => {
    const links = document.querySelectorAll('.quick-nav-link');
    if (!links.length) return;
    const byId = {};
    links.forEach(l => { byId[l.dataset.target] = l; });
    const io = new IntersectionObserver((entries) => {
      // pick the entry closest to the top of viewport that is intersecting
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (!visible.length) return;
      const id = visible[0].target.id;
      links.forEach(l => l.classList.toggle('current', l.dataset.target === id));
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('[data-sv-art]').forEach(el => io.observe(el));
    return () => io.disconnect();
  });

  const innerWidth = Math.max(0, cw - sidePadding * 2);

  return (
    <div ref={containerRef} style={{ padding: `0 ${sidePadding}px 60px`, color:'#fff' }}>
      {sections.map(sec => (
        <section key={sec.id} id={`sv-${sec.id}`} style={{ marginBottom: 56 }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 16, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase',
            color: '#EB1946', margin: '24px 0 12px',
            paddingBottom: 6, borderBottom: '1px solid rgba(235,25,70,0.18)'
          }}>{sec.title}</h2>
          <div style={{ display:'flex', flexDirection:'column', gap: 28 }}>
            {sec.arts.map((a) => (
              <StackedArtboard key={a.id} sectionId={sec.id} art={a}
                innerWidth={innerWidth} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// One artboard inside StackedView. Holds the native-size DOM (used for both
// scaled preview and full-resolution PNG export via html-to-image).
function StackedArtboard({ sectionId, art, innerWidth }) {
  const nativeRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [videoBusy, setVideoBusy] = React.useState(null); // null | "pct"
  const scale = innerWidth > 0 ? Math.min(1, innerWidth / art.width) : 1;
  const scaledH = art.height * scale;
  const safe = (s) => String(s).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');

  const exportPng = async () => {
    const node = nativeRef.current;
    if (!node || !window.htmlToImage) {
      alert('PNG exporter not loaded yet — wait a moment and try again.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await window.htmlToImage.toPng(node, {
        width: art.width, height: art.height, pixelRatio: 1,
        cacheBust: true, backgroundColor: null, // transparent
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cusa_${safe(sectionId)}_${safe(art.id)}.png`;
      a.click();
    } catch (err) {
      console.error('PNG export failed', err);
      alert('PNG export failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  // Video export: capture the in-animation, encode as MOV ProRes 4444 with
  // alpha channel via ffmpeg.wasm (industry-standard Premiere Pro on Mac
  // codec — alpha preserved, single-file). Falls back to PNG-sequence ZIP
  // if ffmpeg fails to load or encode.
  const exportVideo = async () => {
    const node = nativeRef.current;
    if (!node || !window.htmlToImage) {
      alert('Video exporter not ready — refresh and try again.');
      return;
    }
    const fps = 30;
    const durationSec = 2.0; // animations finish well within ~1.8s
    const totalFrames = Math.round(fps * durationSec);
    setVideoBusy('starting');

    // Trigger the artboard's Animate-In so frames capture the full anim.
    const animateInBtn = Array.from(node.parentElement.querySelectorAll('button'))
      .find(b => /Animate In/i.test(b.textContent));
    if (animateInBtn) animateInBtn.click();

    // ── Phase 1: capture frames as transparent PNGs ──
    const frameBlobs = [];
    try {
      const frameStart = performance.now();
      for (let i = 0; i < totalFrames; i++) {
        const target = frameStart + (i * 1000 / fps);
        const now = performance.now();
        if (target > now) await new Promise(r => setTimeout(r, target - now));
        const dataUrl = await window.htmlToImage.toPng(node, {
          width: art.width, height: art.height, pixelRatio: 1,
          cacheBust: false, backgroundColor: null,
        });
        const blob = await (await fetch(dataUrl)).blob();
        frameBlobs.push(blob);
        setVideoBusy(`capture ${Math.round(((i+1)/totalFrames)*100)}%`);
      }
    } catch (err) {
      console.error('Frame capture failed', err);
      alert('Frame capture failed: ' + err.message);
      setVideoBusy(null);
      return;
    }

    // ── Phase 2: try ffmpeg.wasm → MOV ProRes 4444 with alpha ──
    try {
      if (!window.FFmpegWASM || !window.FFmpegUtil) throw new Error('ffmpeg UMD not loaded');
      const { FFmpeg } = window.FFmpegWASM;
      const { toBlobURL } = window.FFmpegUtil;

      // Lazy-load core on first use (cached by browser thereafter).
      if (!window.__ffmpegInstance) {
        setVideoBusy('loading encoder…');
        const baseURL = 'https://unpkg.com/@ffmpeg/[email protected]/dist/umd';
        const ff = new FFmpeg();
        await ff.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        window.__ffmpegInstance = ff;
      }
      const ff = window.__ffmpegInstance;

      // Write frames into ffmpeg's virtual FS as f0000.png … f0059.png
      setVideoBusy('writing frames…');
      for (let i = 0; i < frameBlobs.length; i++) {
        const buf = new Uint8Array(await frameBlobs[i].arrayBuffer());
        await ff.writeFile(`f${String(i).padStart(4,'0')}.png`, buf);
      }

      // Encode: ProRes 4444 (profile 4) at 4:4:4 + alpha (yuva444p10le)
      setVideoBusy('encoding ProRes…');
      await ff.exec([
        '-framerate', String(fps),
        '-i', 'f%04d.png',
        '-c:v', 'prores_ks',
        '-profile:v', '4',
        '-pix_fmt', 'yuva444p10le',
        '-vendor', 'apl0',
        '-q:v', '11',
        '-y', 'out.mov',
      ]);

      const data = await ff.readFile('out.mov');
      const blob = new Blob([data.buffer], { type: 'video/quicktime' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cusa_${safe(sectionId)}_${safe(art.id)}.mov`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      // Clean up FS so we don't leak frames between exports
      try {
        for (let i = 0; i < frameBlobs.length; i++) await ff.deleteFile(`f${String(i).padStart(4,'0')}.png`);
        await ff.deleteFile('out.mov');
      } catch (_) {}

    } catch (err) {
      // Fallback: PNG-sequence ZIP
      console.warn('ProRes encode failed, falling back to PNG sequence', err);
      setVideoBusy('zipping frames (fallback)…');
      try {
        const zip = new window.JSZip();
        const folder = zip.folder(`cusa_${safe(sectionId)}_${safe(art.id)}_seq`);
        for (let i = 0; i < frameBlobs.length; i++) {
          const buf = await frameBlobs[i].arrayBuffer();
          folder.file(String(i).padStart(4,'0') + '.png', buf);
        }
        folder.file('README.txt',
          `CUSA Insider — keyable video element (PNG sequence fallback)\n` +
          `${totalFrames} frames @ ${fps}fps · 1920×1080 PNG with alpha\n\n` +
          `Premiere Pro (Mac): File → Import → 0000.png → check "Image Sequence" → Open.\n` +
          `\nProRes encoding failed — see browser console for details.\n`
        );
        const blob = await zip.generateAsync({ type:'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cusa_${safe(sectionId)}_${safe(art.id)}_video.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (zipErr) {
        console.error('ZIP fallback failed', zipErr);
        alert('Video export failed: ' + zipErr.message);
      }
    } finally {
      setVideoBusy(null);
    }
  };

  return (
    <div id={`sv-${sectionId}-${art.id}`} data-sv-art style={{ position:'relative' }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom: 6, gap: 12, flexWrap:'wrap',
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 800, letterSpacing: 2,
            textTransform:'uppercase', color:'rgba(255,255,255,0.55)',
          }}>{art.label}</div>
          {art.controls}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={exportPng} disabled={busy || videoBusy} style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:800,
            letterSpacing:2, textTransform:'uppercase', color:'#fff',
            background: (busy || videoBusy) ? 'rgba(235,25,70,0.5)' : '#EB1946', border:'none',
            padding:'5px 12px', borderRadius:3, cursor: (busy||videoBusy)?'wait':'pointer',
          }}>{busy ? 'Exporting…' : '↓ PNG'}</button>
          <button onClick={exportVideo} disabled={busy || videoBusy} style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:800,
            letterSpacing:2, textTransform:'uppercase', color:'#fff',
            background: videoBusy ? 'rgba(235,25,70,0.5)' : 'transparent',
            border:'1px solid rgba(255,255,255,0.25)',
            padding:'5px 12px', borderRadius:3, cursor: (busy||videoBusy)?'wait':'pointer',
          }} title="Animated MOV with alpha (ProRes 4444) — drops straight into Premiere Pro on Mac, alpha preserved. First export downloads ~25MB encoder.">
            {videoBusy ? `${videoBusy}` : '▶ VIDEO (.mov)'}
          </button>
        </div>
      </div>
      <div style={{
        width: innerWidth > 0 ? innerWidth : art.width,
        height: scaledH,
        background: '#0a1624',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius: 4, overflow:'hidden', position:'relative',
      }}>
        {/* Outer wrapper holds the scale transform; the captured node stays
            at native 1920×1080 with no transform so html-to-image renders it
            at full export resolution. data-artboard-native lets the Slot
            editor compute pointer-delta → native-pixel ratio for drag/resize. */}
        <div data-artboard-native style={{ width: art.width, height: art.height,
                      transform: `scale(${scale})`, transformOrigin:'top left' }}>
          <div ref={nativeRef} style={{ width: art.width, height: art.height }}>
            {art.content}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesignCanvas, DCSection, DCArtboard, DCPostIt, StackedView, StackedArtboard });

