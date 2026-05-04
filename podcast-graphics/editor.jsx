/* ============================================
   EDITOR — direct-manipulation editing layer
   ----------------------------------------------
   Provides:
     • EditModeProvider — global state (editMode on/off, selection, overrides)
     • <Slot id="..." defaultText defaultColor> — wraps an element so the user
       can click to select, drag to move, and resize via 8 handles.
     • <Inspector /> — contextual panel (text, color, x/y/w/h, font-size)
     • Layout-untouched: each Slot reads from overrides[id] and applies
       position/size as a CSS layer on top of the host's layout calculations.
   ============================================ */

const EditCtx = React.createContext({
  editMode: false,
  selectedId: null,
  overrides: {},
  setEditMode: () => {},
  setSelectedId: () => {},
  patchOverride: () => {},
  resetOverride: () => {},
});

function EditModeProvider({ children }) {
  const [editMode, setEditMode] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [overrides, setOverrides] = React.useState({});

  const patchOverride = React.useCallback((id, patch) => {
    setOverrides((m) => ({ ...m, [id]: { ...(m[id] || {}), ...patch } }));
  }, []);

  const resetOverride = React.useCallback((id) => {
    setOverrides((m) => { const { [id]: _, ...rest } = m; return rest; });
  }, []);

  // Esc deselects
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <EditCtx.Provider value={{
      editMode, selectedId, overrides,
      setEditMode, setSelectedId, patchOverride, resetOverride,
    }}>
      {children}
    </EditCtx.Provider>
  );
}

function useEdit() { return React.useContext(EditCtx); }

// ============================================================
// <Slot> — wraps an element to make it selectable/movable/sizable.
// Pass the slot's "default" position info via props; the override
// (if any) replaces those values. The wrapped child is rendered
// inside a positioning <div> so the host's layout math still runs.
// ============================================================
function Slot({
  id,
  // Default geometry — used when no override exists. Coordinates are in
  // the artboard's native 1920×1080 space.
  defaultLeft, defaultTop, defaultWidth, defaultHeight,
  // Optional default text/color/fontSize so the inspector knows the
  // current values to seed when the user first selects.
  defaultText, defaultColor, defaultFontSize,
  // What kinds of edits make sense for this slot? Any combination of:
  //   'position' | 'size' | 'text' | 'color' | 'fontSize'
  edits = ['position', 'size'],
  label = id,
  children,
  // If true, the slot has no intrinsic size — the wrapper will size to fit content.
  intrinsic = false,
  style,
}) {
  const { editMode, selectedId, overrides, setSelectedId, patchOverride } = useEdit();
  const ov = overrides[id] || {};
  const left   = ov.left   ?? defaultLeft;
  const top    = ov.top    ?? defaultTop;
  const width  = ov.width  ?? defaultWidth;
  const height = ov.height ?? defaultHeight;
  const isSelected = selectedId === id;

  const slotRef = React.useRef(null);
  const dragRef = React.useRef(null);

  // "positioned" elements own their absolute position in the artboard and
  // can be dragged/resized. Inflow elements only support text/color/fontSize.
  const positioned = (defaultLeft != null || defaultTop != null);

  const onClick = (e) => {
    if (!editMode) return;
    e.stopPropagation();
    setSelectedId(id);
  };

  // Drag-to-move
  const onDragStart = (e) => {
    if (!editMode || !isSelected || !positioned) return;
    if (e.target.dataset.handle) return; // resize handle handles its own drag
    e.preventDefault(); e.stopPropagation();
    dragRef.current = {
      sx: e.clientX, sy: e.clientY,
      l0: left, t0: top,
    };
    const wrap = slotRef.current?.closest('[data-artboard-native]');
    const scaleEl = wrap;
    const r = scaleEl?.getBoundingClientRect();
    const scaleX = r ? r.width / 1920 : 1;
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const dx = (ev.clientX - d.sx) / scaleX;
      const dy = (ev.clientY - d.sy) / scaleX;
      patchOverride(id, { left: d.l0 + dx, top: d.t0 + dy });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Resize via handles. Each handle has direction flags.
  const onResizeStart = (dir) => (e) => {
    if (!editMode || !isSelected) return;
    e.preventDefault(); e.stopPropagation();
    const start = {
      sx: e.clientX, sy: e.clientY,
      l: left || 0, t: top || 0,
      w: width || (slotRef.current?.offsetWidth ?? 100),
      h: height || (slotRef.current?.offsetHeight ?? 100),
    };
    const wrap = slotRef.current?.closest('[data-artboard-native]');
    const r = wrap?.getBoundingClientRect();
    const scaleX = r ? r.width / 1920 : 1;
    const move = (ev) => {
      const dx = (ev.clientX - start.sx) / scaleX;
      const dy = (ev.clientY - start.sy) / scaleX;
      const next = {};
      if (dir.includes('e')) next.width  = Math.max(8, start.w + dx);
      if (dir.includes('w')) { next.width  = Math.max(8, start.w - dx); next.left = start.l + dx; }
      if (dir.includes('s')) next.height = Math.max(8, start.h + dy);
      if (dir.includes('n')) { next.height = Math.max(8, start.h - dy); next.top  = start.t + dy; }
      patchOverride(id, next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const handleDirs = ['n','ne','e','se','s','sw','w','nw'];
  const handleStyle = (dir) => {
    const sz = 12, half = sz/2;
    const map = {
      n:  { left:'50%', top:0,        cursor:'ns-resize',  transform:`translate(-${half}px,-${half}px)` },
      ne: { right:0,    top:0,        cursor:'nesw-resize',transform:`translate(${half}px,-${half}px)` },
      e:  { right:0,    top:'50%',    cursor:'ew-resize',  transform:`translate(${half}px,-${half}px)` },
      se: { right:0,    bottom:0,     cursor:'nwse-resize',transform:`translate(${half}px,${half}px)` },
      s:  { left:'50%', bottom:0,     cursor:'ns-resize',  transform:`translate(-${half}px,${half}px)` },
      sw: { left:0,     bottom:0,     cursor:'nesw-resize',transform:`translate(-${half}px,${half}px)` },
      w:  { left:0,     top:'50%',    cursor:'ew-resize',  transform:`translate(-${half}px,-${half}px)` },
      nw: { left:0,     top:0,        cursor:'nwse-resize',transform:`translate(-${half}px,-${half}px)` },
    };
    return {
      position:'absolute', width:sz, height:sz, background:'#EB1946',
      border:'1.5px solid #fff', borderRadius:2, zIndex:10001,
      ...map[dir],
    };
  };

  // Override styles to forward to the rendered child. Function-children
  // are expected to spread these onto their text element so overrides win.
  const overrideStyle = {};
  if (ov.color) overrideStyle.color = ov.color;
  if (ov.fontSize) overrideStyle.fontSize = ov.fontSize + 'px';

  // Provide the override text via context if children expect it
  const textChild = (typeof children === 'function')
    ? children({ text: ov.text ?? defaultText, style: overrideStyle })
    : children;

  // Container: positioned in the artboard if defaultLeft/defaultTop given,
  // otherwise renders inline (preserves host's flex/flow layout).
  const baseStyle = positioned ? {
    position:'absolute',
    left, top, width, height,
    ...style,
  } : { ...style };

  // Selection visual frame
  const ring = (editMode && isSelected) ? {
    outline:'2px solid #EB1946',
    outlineOffset:'2px',
  } : (editMode ? {
    outline:'1px dashed rgba(255,255,255,0.25)',
    outlineOffset:'2px',
  } : {});

  return (
    <div
      ref={slotRef}
      data-slot-id={id}
      data-slot-label={label}
      data-slot-positioned={positioned ? '1' : '0'}
      onPointerDown={onDragStart}
      onClick={onClick}
      style={{ ...baseStyle, ...ring, cursor: editMode ? (isSelected ? (positioned ? 'move' : 'pointer') : 'pointer') : 'default' }}
    >
      {textChild}
      {editMode && isSelected && positioned && handleDirs.map(d => (
        <div key={d} data-handle={d} style={handleStyle(d)} onPointerDown={onResizeStart(d)} />
      ))}
    </div>
  );
}

// ============================================================
// <Inspector> — right-rail panel that surfaces the selected slot.
// Renders nothing when nothing is selected.
// ============================================================
function Inspector() {
  const { editMode, selectedId, overrides, patchOverride, resetOverride } = useEdit();
  if (!editMode || !selectedId) return null;

  // Find the slot's defaults from the DOM. We stash defaults on the element
  // via data-slot-defaults so the inspector can read them.
  const el = document.querySelector(`[data-slot-id="${selectedId}"]`);
  const label = el?.dataset.slotLabel || selectedId;
  const positioned = el?.dataset.slotPositioned === '1';
  const ov = overrides[selectedId] || {};

  const fields = [];
  // Text
  fields.push(
    <Row key="text" label="Text">
      <input className="ed-input" type="text"
             value={ov.text ?? ''} placeholder="(default)"
             onChange={(e) => patchOverride(selectedId, { text: e.target.value })} />
    </Row>
  );
  // Color
  fields.push(
    <Row key="color" label="Color">
      <input className="ed-color" type="color"
             value={ov.color || '#ffffff'}
             onChange={(e) => patchOverride(selectedId, { color: e.target.value })} />
    </Row>
  );
  // Font size
  fields.push(
    <Row key="fs" label="Font Size">
      <input className="ed-num" type="number" min="8" max="600" step="1"
             value={ov.fontSize ?? ''} placeholder="(default)"
             onChange={(e) => patchOverride(selectedId, { fontSize: Number(e.target.value) || undefined })} />
      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>px</span>
    </Row>
  );
  // Position/size — only meaningful for positioned slots (drag-/resize-able).
  if (positioned) {
    fields.push(
      <Row key="x" label="X (px)">
        <input className="ed-num" type="number" step="1"
               value={Math.round(ov.left ?? 0)}
               onChange={(e) => patchOverride(selectedId, { left: Number(e.target.value) })} />
      </Row>
    );
    fields.push(
      <Row key="y" label="Y (px)">
        <input className="ed-num" type="number" step="1"
               value={Math.round(ov.top ?? 0)}
               onChange={(e) => patchOverride(selectedId, { top: Number(e.target.value) })} />
      </Row>
    );
    fields.push(
      <Row key="w" label="Width (px)">
        <input className="ed-num" type="number" step="1"
               value={Math.round(ov.width ?? 0)}
               onChange={(e) => patchOverride(selectedId, { width: Number(e.target.value) })} />
      </Row>
    );
    fields.push(
      <Row key="h" label="Height (px)">
        <input className="ed-num" type="number" step="1"
               value={Math.round(ov.height ?? 0)}
               onChange={(e) => patchOverride(selectedId, { height: Number(e.target.value) })} />
      </Row>
    );
  }

  return (
    <div className="ed-panel">
      <style>{__EDITOR_STYLE}</style>
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">Inspector</div>
          <div className="ed-title">{label}</div>
        </div>
        <button className="ed-reset" onClick={() => resetOverride(selectedId)}>Reset</button>
      </div>
      <div className="ed-body">{fields}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="ed-row">
      <label className="ed-lbl">{label}</label>
      <div className="ed-ctl">{children}</div>
    </div>
  );
}

const __EDITOR_STYLE = `
  .ed-panel{position:fixed;right:16px;top:80px;width:300px;z-index:2147483645;
    background:#0e1d2e;color:#fff;border:1px solid rgba(235,25,70,0.30);border-radius:6px;
    box-shadow:0 16px 50px rgba(0,0,0,.55);font-family:'Barlow',sans-serif}
  .ed-head{display:flex;align-items:center;justify-content:space-between;
    padding:11px 14px;background:#0a1624;border-bottom:1px solid rgba(255,255,255,0.08)}
  .ed-eyebrow{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;
    letter-spacing:3px;text-transform:uppercase;color:rgba(235,25,70,0.85)}
  .ed-title{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;
    letter-spacing:1px;color:#fff;margin-top:2px}
  .ed-reset{background:transparent;border:1px solid rgba(255,255,255,0.25);color:#fff;
    font:10px 'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:2px;
    text-transform:uppercase;padding:6px 10px;border-radius:4px;cursor:pointer}
  .ed-reset:hover{background:rgba(255,255,255,0.06)}
  .ed-body{padding:10px 14px 14px;display:flex;flex-direction:column;gap:8px;
    max-height:60vh;overflow-y:auto}
  .ed-row{display:flex;align-items:center;gap:8px}
  .ed-lbl{flex:0 0 80px;font-family:'Barlow Condensed',sans-serif;font-size:10px;
    font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.55)}
  .ed-ctl{flex:1;display:flex;align-items:center;gap:6px}
  .ed-input,.ed-num{flex:1;background:#0a1624;color:#fff;border:1px solid rgba(255,255,255,0.18);
    border-radius:4px;padding:7px 9px;font:13px 'Barlow',sans-serif;outline:none;width:100%}
  .ed-num{font-variant-numeric:tabular-nums}
  .ed-input:focus,.ed-num:focus{border-color:#EB1946}
  .ed-color{appearance:none;-webkit-appearance:none;width:50px;height:30px;
    border:1px solid rgba(255,255,255,0.18);border-radius:4px;padding:0;cursor:pointer;
    background:transparent}
  .ed-color::-webkit-color-swatch-wrapper{padding:0}
  .ed-color::-webkit-color-swatch{border:0;border-radius:3px}
`;

// ============================================================
// EditModeToggle — small button rendered inside the TweaksPanel.
// ============================================================
function EditModeToggle() {
  const { editMode, setEditMode, setSelectedId } = useEdit();
  return (
    <button
      onClick={() => {
        const next = !editMode;
        setEditMode(next);
        if (!next) setSelectedId(null);
      }}
      style={{
        width:'100%', padding:'10px 12px', border:'none', borderRadius:4,
        background: editMode ? '#EB1946' : 'transparent',
        color:'#fff', cursor:'pointer',
        border: editMode ? 'none' : '1px solid rgba(255,255,255,0.25)',
        font:'12px "Barlow Condensed",sans-serif', fontWeight:800,
        letterSpacing:2, textTransform:'uppercase',
      }}>
      {editMode ? '◉ Edit Mode · ON' : '○ Enable Edit Mode'}
    </button>
  );
}

Object.assign(window, {
  EditCtx, EditModeProvider, useEdit,
  Slot, Inspector, EditModeToggle,
});
