/* ============================================
   APP — design canvas + tweaks
   ============================================ */

const { useState, useEffect, useRef } = React;

// Default tweaks (must be a marked block for host persistence)
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sport": "football",
  "layout": "full",
  "accent": "#E40046",
  "background": "strips",
  "homeTri": "DEL",
  "homeName": "DELAWARE",
  "homeInitials": "DEL",
  "homePrimary": "#00539F",
  "homeSecondary": "#FFD200",
  "homeRecord": "5-1 (3-0)",
  "homeRank": "12",
  "homeScore": 27,
  "awayTri": "LIB",
  "awayName": "LIBERTY",
  "awayInitials": "LIB",
  "awayPrimary": "#0A254E",
  "awaySecondary": "#B72025",
  "awayRecord": "6-0 (4-0)",
  "awayRank": "5",
  "awayScore": 24,
  "date": "SAT • OCT 18",
  "time": "7:00 PM CT",
  "network": "ESPN+",
  "schoolLogoSize": 100,
  "schoolLogoOffsetX": 0,
  "schoolLogoOffsetY": 0,
  "networkLogoSize": 100,
  "networkLogoOffsetX": 0,
  "networkLogoOffsetY": 0,
  "networkLogoOnly": 100
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  { label: 'Red',   value: '#E40046' },
  { label: 'Blue',  value: '#00B5E2' },
  { label: 'Green', value: '#A7D500' },
  { label: 'Navy',  value: '#00263A' },
];

// ---------- Hook to make an artboard restart its anim ----------
function useReplayKey() {
  const [key, setKey] = useState(0);
  return [key, () => setKey(k => k + 1)];
}

// ---------- Artboard wrapper that handles animation in/out ----------
function AnimArtboard({ children, animKey, autoplay = true, delay = 0 }) {
  const [state, setState] = useState('hidden');
  useEffect(() => {
    if (!autoplay) { setState('rest'); return; }
    setState('hidden');
    const t1 = setTimeout(() => setState('in'), 50 + delay);
    const t2 = setTimeout(() => setState('rest'), 50 + delay + 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animKey, autoplay]);
  return React.cloneElement(children, { animState: state, animKey });
}

// ---------- Replay control inside artboards ----------
function ArtboardWithReplay({ render, defaultAutoplay = true }) {
  const [k, replay] = useReplayKey();
  const [state, setState] = useState('hidden');

  useEffect(() => {
    setState('hidden');
    const t1 = setTimeout(() => setState('in'), 80);
    const t2 = setTimeout(() => setState('rest'), 80 + 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [k]);

  const triggerOut = () => {
    setState('out');
    setTimeout(() => replay(), 700);
  };

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080 }}>
      {render({ animState: state, animKey: k })}
      <ReplayBtn onReplay={replay} onAnimateOut={triggerOut} />
    </div>
  );
}

function ReplayBtn({ onReplay, onAnimateOut }) {
  const accent = {
    background:'#EB1946', color:'#fff', border:'1px solid #EB1946',
    padding:'8px 14px', cursor:'pointer', borderRadius:4,
    fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14,
    letterSpacing:'0.12em', textTransform:'uppercase',
  };
  const ghost = {
    background:'rgba(10,22,36,0.78)', color:'#fff',
    border:'1px solid rgba(255,255,255,0.22)',
    padding:'8px 14px', cursor:'pointer', borderRadius:4,
    fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14,
    letterSpacing:'0.12em', textTransform:'uppercase',
    backdropFilter:'blur(6px)',
  };
  return (
    <div style={{ position:'absolute', top:14, right:14, zIndex:50, display:'flex', gap:8 }}>
      <button onClick={onReplay} style={accent}>↻ Animate In</button>
      <button onClick={onAnimateOut} style={ghost}>← Animate Out</button>
    </div>
  );
}

// ---------- SportPicker (small dropdown rendered in each artboard's label row) ----------
function SportPicker({ value, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{
        fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:800,
        letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.45)',
      }}>Sport</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        fontFamily:"'Barlow',sans-serif", fontSize:12, color:'#fff',
        background:'#0a1624', border:'1px solid rgba(255,255,255,0.18)',
        borderRadius:3, padding:'4px 8px', outline:'none',
      }}>
        {SPORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </label>
  );
}

// ---------- App ----------
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const home = {
    name: tweaks.homeName, initials: tweaks.homeInitials,
    tri: tweaks.homeTri,
    primary: tweaks.homePrimary, secondary: tweaks.homeSecondary,
    record: tweaks.homeRecord, rank: tweaks.homeRank,
  };
  const away = {
    name: tweaks.awayName, initials: tweaks.awayInitials,
    tri: tweaks.awayTri,
    primary: tweaks.awayPrimary, secondary: tweaks.awaySecondary,
    record: tweaks.awayRecord, rank: tweaks.awayRank,
  };

  const logoControls = {
    schoolLogoScale: (tweaks.schoolLogoSize || 100) / 100,
    schoolLogoOffsetX: Number(tweaks.schoolLogoOffsetX) || 0,
    schoolLogoOffsetY: Number(tweaks.schoolLogoOffsetY) || 0,
    networkLogoScale: (tweaks.networkLogoSize || 100) / 100,
    networkLogoOffsetX: Number(tweaks.networkLogoOffsetX) || 0,
    networkLogoOffsetY: Number(tweaks.networkLogoOffsetY) || 0,
    networkLogoOnlyScale: (tweaks.networkLogoOnly || 100) / 100,
  };

  const matchupProps = {
    sport: tweaks.sport, accent: tweaks.accent,
    background: tweaks.background,
    home, away,
    date: tweaks.date, time: tweaks.time, network: tweaks.network,
    ...logoControls,
  };

  const scoreProps = {
    sport: tweaks.sport, accent: tweaks.accent,
    background: tweaks.background,
    home, away,
    homeScore: Number(tweaks.homeScore) || 0,
    awayScore: Number(tweaks.awayScore) || 0,
    ...logoControls,
  };

  // Build team option lists
  const cusaTeamOptions = (window.CUSA_TRIS || []).map(tri => {
    const t = window.TEAMS[tri];
    return t ? { value: tri, label: `${t.name} (${tri})` } : { value: tri, label: tri };
  });
  const allTeamOptions = Object.entries(window.TEAMS || {})
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([tri, t]) => ({ value: tri, label: `${t.name}${t.tri ? ' · ' + t.tri : ''}` }));

  function pickTeam(side, tri) {
    const t = window.TEAMS[tri];
    if (!t) return;
    const prefix = side; // 'home' | 'away'
    setTweak({
      [`${prefix}Tri`]: tri,
      [`${prefix}Name`]: t.name.toUpperCase(),
      [`${prefix}Initials`]: t.tri || tri,
      [`${prefix}Primary`]: t.primary,
      [`${prefix}Secondary`]: t.secondary,
    });
  }

  // When iframed by campus-insider, render the same children in a vertical
  // stack with auto-fit width + a quick-nav sidebar (built into the host page).
  const isEmbedded = typeof document !== 'undefined' && document.documentElement.classList.contains('embedded');
  const Canvas = isEmbedded ? StackedView : DesignCanvas;
  const canvasProps = isEmbedded ? {} : { initialZoom: 0.32, padding: 120 };

  // Atomic Elements is the admin portal — only visible when ?admin=1 is in the URL.
  const isAdmin = typeof location !== 'undefined' && new URLSearchParams(location.search).has('admin');

  // Per-graphic sport state — each consolidated section picks its own sport.
  const [sectionSport, setSectionSport] = React.useState({
    'm-lt':   'football',
    'm-ls':   'football',
    's-full': 'basketball',
    's-lt':   'basketball',
    's-ls':   'basketball',
  });
  const setSport = (id) => (v) => setSectionSport(s => ({ ...s, [id]: v }));

  return (
    <>
      <Canvas {...canvasProps}>
        {/* MATCHUP · LOWER THIRD ─ active sport selectable per-graphic */}
        <DCSection id="m-lt-section" title="MATCHUP · LOWER THIRD">
          <DCArtboard id="m-lt" label="Matchup · Lower Third (transparent)" width={1920} height={1080}
            controls={<SportPicker value={sectionSport['m-lt']} onChange={setSport('m-lt')} />}>
            <ArtboardWithReplay render={(p) => (
              <CheckerBg>
                <MatchupFrame {...matchupProps} sport={sectionSport['m-lt']} layout="lower-third" transparent {...p} />
              </CheckerBg>
            )} />
          </DCArtboard>
        </DCSection>

        {/* MATCHUP · LEFT SLAB */}
        <DCSection id="m-ls-section" title="MATCHUP · LEFT SLAB">
          <DCArtboard id="m-ls" label="Matchup · Left Slab (transparent)" width={1920} height={1080}
            controls={<SportPicker value={sectionSport['m-ls']} onChange={setSport('m-ls')} />}>
            <ArtboardWithReplay render={(p) => (
              <CheckerBg>
                <MatchupFrame {...matchupProps} sport={sectionSport['m-ls']} layout="left-slab" transparent {...p} />
              </CheckerBg>
            )} />
          </DCArtboard>
        </DCSection>

        {/* SCORE · FULL SCREEN */}
        <DCSection id="s-full-section" title="FINAL SCORE · FULL SCREEN">
          <DCArtboard id="s-full" label="Score · Full Screen" width={1920} height={1080}
            controls={<SportPicker value={sectionSport['s-full']} onChange={setSport('s-full')} />}>
            <ArtboardWithReplay render={(p) => (
              <ScoreFrame {...scoreProps} sport={sectionSport['s-full']} layout="full" homeScore={78} awayScore={72} {...p} />
            )} />
          </DCArtboard>
        </DCSection>

        {/* SCORE · LOWER THIRD */}
        <DCSection id="s-lt-section" title="FINAL SCORE · LOWER THIRD">
          <DCArtboard id="s-lt" label="Score · Lower Third (transparent)" width={1920} height={1080}
            controls={<SportPicker value={sectionSport['s-lt']} onChange={setSport('s-lt')} />}>
            <ArtboardWithReplay render={(p) => (
              <CheckerBg>
                <ScoreFrame {...scoreProps} sport={sectionSport['s-lt']} layout="lower-third" homeScore={78} awayScore={72} {...p} />
              </CheckerBg>
            )} />
          </DCArtboard>
        </DCSection>

        {/* SCORE · LEFT SLAB */}
        <DCSection id="s-ls-section" title="FINAL SCORE · LEFT SLAB">
          <DCArtboard id="s-ls" label="Score · Left Slab (transparent)" width={1920} height={1080}
            controls={<SportPicker value={sectionSport['s-ls']} onChange={setSport('s-ls')} />}>
            <ArtboardWithReplay render={(p) => (
              <CheckerBg>
                <ScoreFrame {...scoreProps} sport={sectionSport['s-ls']} layout="left-slab" homeScore={78} awayScore={72} {...p} />
              </CheckerBg>
            )} />
          </DCArtboard>
        </DCSection>

        {/* SECTION: Atomic elements (Admin only — visible when ?admin=1) */}
        {isAdmin && <DCSection id="elements" title="ATOMIC ELEMENTS — INDEPENDENT, ANIMATABLE LAYERS">
          <DCArtboard id="el-stark" label="The Stark" width={600} height={400}>
            <ElementShowcase>
              <Stark size={300} color="#E40046" />
            </ElementShowcase>
          </DCArtboard>
          <DCArtboard id="el-bg" label="Stark Pattern Background" width={800} height={400}>
            <div style={{ width: 800, height: 400, background: '#00263A', position: 'relative', overflow: 'hidden' }}>
              <BgPattern opacity={0.12} />
            </div>
          </DCArtboard>
          <DCArtboard id="el-strips-navy" label="Stark Strips on Navy" width={800} height={450}>
            <div style={{ width: 800, height: 450, background: '#00263A', position: 'relative', overflow: 'hidden' }}>
              <StarkStripsBg opacity={1} />
            </div>
          </DCArtboard>
          <DCArtboard id="el-strips" label="Stark Strips on White" width={800} height={450}>
            <div style={{ width: 800, height: 450, background: '#fff', position: 'relative', overflow: 'hidden' }}>
              <StarkStripsBg opacity={1} />
            </div>
          </DCArtboard>
          {SPORTS.map(sp => (
            <DCArtboard key={`icon-${sp.key}`} id={`icon-${sp.key}`} label={`Icon · ${sp.label}`} width={300} height={300}>
              <div style={{ width: 300, height: 300, background: '#00263A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.createElement(SportIcons[sp.key], { size: 200, color: '#fff' })}
              </div>
            </DCArtboard>
          ))}
          <DCArtboard id="el-shield" label="Real Team Logos (CUSA)" width={1100} height={400}>
            <div style={{ width: 1100, height: 400, background: '#00263A', position: 'relative', overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: 24 }}>
              {['DEL','FIU','JVST','KENN','LIB','LT','MTSU','MOST','NMSU','SHSU','UTEP','WKU'].map(tri => (
                <img key={tri} src={`assets/logos/${tri}.png`} alt={tri}
                     style={{ width: 130, height: 130, objectFit: 'contain' }} />
              ))}
            </div>
          </DCArtboard>
          <DCArtboard id="el-final" label="FINAL Stamp" width={500} height={300}>
            <ElementShowcase>
              <div style={{
                background: '#E40046', color: '#fff', padding: '14px 50px',
                fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic', fontSize: 80,
                letterSpacing: '0.12em', border: '4px solid #fff',
                transform: 'rotate(-8deg)',
              }}>FINAL</div>
            </ElementShowcase>
          </DCArtboard>
          <DCArtboard id="el-vs" label="VS Mark" width={400} height={300}>
            <ElementShowcase>
              <div style={{
                fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic', fontSize: 200, color: '#E40046',
                lineHeight: 0.85, textShadow: '0 6px 0 rgba(0,0,0,0.25)',
              }}>VS</div>
            </ElementShowcase>
          </DCArtboard>
          <DCArtboard id="el-meta" label="Date / Time / Network bar" width={1100} height={200}>
            <ElementShowcase>
              <div style={{ display: 'flex' }}>
                <div style={{ background: '#fff', color: '#00263A', padding: '18px 44px',
                              fontFamily: 'Saira Condensed, sans-serif', fontWeight: 800, fontSize: 38, letterSpacing: '0.08em' }}>SAT · OCT 18</div>
                <div style={{ background: '#E40046', color: '#fff', padding: '18px 44px',
                              fontFamily: 'Saira Condensed, sans-serif', fontWeight: 800, fontSize: 38, letterSpacing: '0.08em' }}>7:00 PM CT</div>
                <div style={{ background: '#00263A', padding: '12px 28px', border: '2px solid #fff', display: 'flex', alignItems: 'center' }}><NetworkLogo network="ESPN+" theme="dark" height={42} /></div>
              </div>
            </ElementShowcase>
          </DCArtboard>
        </DCSection>}
      </Canvas>

      <TweaksPanel title="Graphics Controls" defaultPosition={{ right: 24, bottom: 24 }}>
        <TweakSection title="Direct Edit">
          <EditModeToggle />
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.4, marginTop:4 }}>
            Click an outlined element on the artboard to select it. Drag to move, drag handles to resize. Edits appear in the Inspector panel.
          </div>
        </TweakSection>
        <TweakSection title="Layout">
          <TweakSelect label="Layout" value={tweaks.layout} onChange={v => setTweak('layout', v)}
            options={[
              { value: 'full', label: 'Full Screen' },
              { value: 'lower-third', label: 'Lower Third' },
              { value: 'left-slab', label: 'Left Slab' },
            ]} />
          <TweakSelect label="Sport" value={tweaks.sport} onChange={v => setTweak('sport', v)}
            options={SPORTS.map(s => ({ value: s.key, label: s.label }))} />
          <TweakRadio label="Accent" value={tweaks.accent} onChange={v => setTweak('accent', v)}
            options={ACCENT_OPTIONS} />
          <TweakSelect label="Background" value={tweaks.background} onChange={v => setTweak('background', v)}
            options={[
              { value: 'navy',   label: 'Navy + Stark watermark' },
              { value: 'strips', label: 'Stark Strips (red corners)' },
              { value: 'white',  label: 'White' },
            ]} />
        </TweakSection>

        <TweakSection title="Home Team">
          <TweakSelect label="CUSA Team" value={tweaks.homeTri || ''} onChange={v => pickTeam('home', v)}
            options={[{ value: '', label: '— Pick CUSA team —' }, ...cusaTeamOptions]} />
          <TweakSelect label="All Schools" value={tweaks.homeTri || ''} onChange={v => pickTeam('home', v)}
            options={[{ value: '', label: '— Pick any school —' }, ...allTeamOptions]} />
          <TweakText label="Name" value={tweaks.homeName} onChange={v => setTweak('homeName', v)} />
          <TweakText label="Initials" value={tweaks.homeInitials} onChange={v => setTweak('homeInitials', v)} />
          <TweakColor label="Primary" value={tweaks.homePrimary} onChange={v => setTweak('homePrimary', v)} />
          <TweakColor label="Secondary" value={tweaks.homeSecondary} onChange={v => setTweak('homeSecondary', v)} />
          <TweakText label="Record" value={tweaks.homeRecord} onChange={v => setTweak('homeRecord', v)} />
          <TweakText label="Rank (blank = none)" value={tweaks.homeRank} onChange={v => setTweak('homeRank', v)} />
          <TweakNumber label="Score" value={tweaks.homeScore} onChange={v => setTweak('homeScore', v)} />
        </TweakSection>

        <TweakSection title="Away Team">
          <TweakSelect label="CUSA Team" value={tweaks.awayTri || ''} onChange={v => pickTeam('away', v)}
            options={[{ value: '', label: '— Pick CUSA team —' }, ...cusaTeamOptions]} />
          <TweakSelect label="All Schools" value={tweaks.awayTri || ''} onChange={v => pickTeam('away', v)}
            options={[{ value: '', label: '— Pick any school —' }, ...allTeamOptions]} />
          <TweakText label="Name" value={tweaks.awayName} onChange={v => setTweak('awayName', v)} />
          <TweakText label="Initials" value={tweaks.awayInitials} onChange={v => setTweak('awayInitials', v)} />
          <TweakColor label="Primary" value={tweaks.awayPrimary} onChange={v => setTweak('awayPrimary', v)} />
          <TweakColor label="Secondary" value={tweaks.awaySecondary} onChange={v => setTweak('awaySecondary', v)} />
          <TweakText label="Record" value={tweaks.awayRecord} onChange={v => setTweak('awayRecord', v)} />
          <TweakText label="Rank (blank = none)" value={tweaks.awayRank} onChange={v => setTweak('awayRank', v)} />
          <TweakNumber label="Score" value={tweaks.awayScore} onChange={v => setTweak('awayScore', v)} />
        </TweakSection>

        <TweakSection title="Game Info">
          <TweakText label="Date" value={tweaks.date} onChange={v => setTweak('date', v)} />
          <TweakText label="Time" value={tweaks.time} onChange={v => setTweak('time', v)} />
          <TweakSelect label="Network" value={tweaks.network} onChange={v => setTweak('network', v)}
            options={[
              { value: 'ESPN+', label: 'ESPN+' },
              { value: 'ESPN', label: 'ESPN' },
              { value: 'CBSSN', label: 'CBS Sports Network' },
              { value: 'CBS Stacked', label: 'CBS Sports Network (stacked)' },
            ]} />
        </TweakSection>

        <TweakSection title="School Shield Size & Position">
          <TweakSlider label="Size %" min={40} max={180} step={5} value={tweaks.schoolLogoSize} onChange={v => setTweak('schoolLogoSize', v)} />
          <TweakSlider label="Offset X (px)" min={-200} max={200} step={2} value={tweaks.schoolLogoOffsetX} onChange={v => setTweak('schoolLogoOffsetX', v)} />
          <TweakSlider label="Offset Y (px)" min={-200} max={200} step={2} value={tweaks.schoolLogoOffsetY} onChange={v => setTweak('schoolLogoOffsetY', v)} />
        </TweakSection>

        <TweakSection title="Network Logo Size & Position">
          <TweakSlider label="Bar Size %" min={40} max={200} step={5} value={tweaks.networkLogoSize} onChange={v => setTweak('networkLogoSize', v)} />
          <TweakSlider label="Logo Only %" min={40} max={250} step={5} value={tweaks.networkLogoOnly} onChange={v => setTweak('networkLogoOnly', v)} />
          <TweakSlider label="Offset X (px)" min={-300} max={300} step={2} value={tweaks.networkLogoOffsetX} onChange={v => setTweak('networkLogoOffsetX', v)} />
          <TweakSlider label="Offset Y (px)" min={-200} max={200} step={2} value={tweaks.networkLogoOffsetY} onChange={v => setTweak('networkLogoOffsetY', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function ElementShowcase({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#060f1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'linear-gradient(45deg, #0e1d2e 25%, transparent 25%), linear-gradient(-45deg, #0e1d2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0e1d2e 75%), linear-gradient(-45deg, transparent 75%, #0e1d2e 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    }}>
      {children}
    </div>
  );
}

function CheckerBg({ children }) {
  return (
    <div style={{
      width: 1920, height: 1080, position: 'relative',
      backgroundImage: 'linear-gradient(45deg, #2a2f35 25%, transparent 25%), linear-gradient(-45deg, #2a2f35 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2f35 75%), linear-gradient(-45deg, transparent 75%, #2a2f35 75%)',
      backgroundSize: '40px 40px',
      backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
      backgroundColor: '#1a1f25',
    }}>
      {children}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <EditModeProvider>
    <App />
    <Inspector />
  </EditModeProvider>
);
