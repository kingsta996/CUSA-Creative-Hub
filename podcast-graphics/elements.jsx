/* ============================================
   CUSA INSIDER — REUSABLE ELEMENTS
   Each element is a standalone, animatable layer.
   ============================================ */

// ---------- THE STARK (CUSA's official comet-star asset) ----------
// Per brand book: "DO NOT rotate the stark from its original position/axis."
// Native aspect ratio 1038:571 (~1.82:1). `size` = width.
function Stark({ size = 200, color = '#E40046', style = {}, className = '', ...rest }) {
  // Pick the closest pre-colored asset for crispness; CSS filter as fallback for arbitrary colors.
  const presets = {
    '#E40046': 'assets/stark-red.png',
    '#00263A': 'assets/stark-navy.png',
    '#00B5E2': 'assets/stark-blue.png',
  };
  const src = presets[color] || 'assets/stark-navy.png';
  // For arbitrary colors not in presets, mask-image would be ideal but for broad compat we just use the closest preset.
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size * (571/1038)}
      className={className}
      style={{ display: 'block', ...style }}
      {...rest}
    />
  );
}

// Outline variant
function StarkOutline({ size = 200, style = {}, ...rest }) {
  return (
    <img
      src="assets/stark-outline.png"
      alt=""
      width={size}
      height={size * (571/1038)}
      style={{ display: 'block', ...style }}
      {...rest}
    />
  );
}

// ---------- DIAGONAL STRIPE MOTIF ----------
// Three equal-width, equal-gap diagonal stripes — a single set per corner.
// Implemented with a linear-gradient (non-repeating) so the bars never deform:
// thickness/gap are exact pixel measurements regardless of container size.
function StripeMotif({ width = 600, height = 120, direction = 'tl',
                      colors = ['#00B5E2', '#A7D500', '#E40046'],
                      thickness = 22, gap = 12, angle = 60,
                      style = {}, className = '' }) {
  // CSS gradient angle: 0deg=up, 90deg=right, etc.
  const dirAngles = {
    tl:  angle,           // bars tilt up-right    (anchor in top-left corner)
    tr: -angle,           // bars tilt up-left     (anchor in top-right corner)
    bl: 180 - angle,      // bars tilt down-right  (anchor in bottom-left)
    br: 180 + angle,      // bars tilt down-left   (anchor in bottom-right)
  };
  const a = dirAngles[direction] ?? angle;
  const t = thickness, g = gap;

  const stops = [
    `transparent 0px`,
    `transparent ${g}px`,
    `${colors[0]} ${g}px`,
    `${colors[0]} ${g + t}px`,
    `transparent ${g + t}px`,
    `transparent ${g*2 + t}px`,
    `${colors[1]} ${g*2 + t}px`,
    `${colors[1]} ${g*2 + t*2}px`,
    `transparent ${g*2 + t*2}px`,
    `transparent ${g*3 + t*2}px`,
    `${colors[2]} ${g*3 + t*2}px`,
    `${colors[2]} ${g*3 + t*3}px`,
    `transparent ${g*3 + t*3}px`,
  ];

  return (
    <div className={className}
         style={{
           width, height, position: 'relative', overflow: 'hidden',
           background: `linear-gradient(${a}deg, ${stops.join(', ')})`,
           ...style,
         }} />
  );
}

// ---------- BACKGROUND PATTERN (stark watermark using real shape) ----------
function BgPattern({ opacity = 0.05 }) {
  // Use the outline stark as a tiled background watermark
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'url("assets/stark-outline.png")',
      backgroundSize: '180px auto',
      backgroundRepeat: 'repeat',
      opacity,
      filter: 'invert(1)',
      pointerEvents: 'none',
    }} />
  );
}

// ---------- SPORT ICONS (broadcast-friendly, real ball iconography) ----------
// PNGs (white-on-transparent) extracted from the brand "Sport Icons - TV" sheet.
// `color` only flips between white (default) and navy via CSS filter for use on light backgrounds.
function makeSportIcon(file) {
  return function ({ size = 60, color = '#fff', style = {} }) {
    // White is the native asset. For navy we invert.
    const filter = (color && color.toLowerCase() !== '#fff' && color.toLowerCase() !== '#ffffff' && color !== 'white')
      ? 'invert(1) brightness(0.45) saturate(1.5) hue-rotate(180deg)'
      : 'none';
    return (
      <img src={`assets/sport-${file}.png`} alt=""
           width={size} height={size}
           style={{ display: 'block', filter, ...style }} />
    );
  };
}
const SportIcons = {
  football:   makeSportIcon('football'),
  basketball: makeSportIcon('basketball'),
  soccer:     makeSportIcon('soccer'),
  volleyball: makeSportIcon('volleyball'),
  baseball:   makeSportIcon('baseball'),
  softball:   makeSportIcon('softball'),
};

const SPORTS = [
  { key: 'football',   label: 'FOOTBALL',   short: 'FB' },
  { key: 'basketball', label: 'BASKETBALL', short: 'MBB' },
  { key: 'soccer',     label: 'SOCCER',     short: 'SOC' },
  { key: 'volleyball', label: 'VOLLEYBALL', short: 'VB' },
  { key: 'baseball',   label: 'BASEBALL',   short: 'BSB' },
  { key: 'softball',   label: 'SOFTBALL',   short: 'SB' },
];

// ---------- TEAM SHIELD (real logo if available, else abstract fallback) ----------
// LOGOS map: tricode → asset path (relative). Add to this map to wire up more schools.
const LOGOS = {
  DEL:  'assets/logos/DEL.png',
  FIU:  'assets/logos/FIU.png',
  JVST: 'assets/logos/JVST.png',
  KENN: 'assets/logos/KENN.png',
  LIB:  'assets/logos/LIB.png',
  LT:   'assets/logos/LT.png',
  MTSU: 'assets/logos/MTSU.png',
  MOST: 'assets/logos/MOST.png',
  NMSU: 'assets/logos/NMSU.png',
  SHSU: 'assets/logos/SHSU.png',
  UTEP: 'assets/logos/UTEP.png',
  WKU:  'assets/logos/WKU.png',
};

function TeamShield({ initials = 'TM', primary = '#0A254E', secondary = '#990000', size = 200, style = {}, tri = '' }) {
  const logo = LOGOS[(tri || initials || '').toUpperCase()];
  if (logo) {
    // Real logo — render PNG centered & contained inside a transparent square.
    return (
      <img src={logo} alt={initials}
           width={size} height={size}
           style={{ display: 'block', objectFit: 'contain', ...style }} />
    );
  }
  // Fallback abstract shield with initials & team colors
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <defs>
        <linearGradient id={`g-${initials}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={primary} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path
        d="M 50 4 L 92 16 L 92 52 Q 92 80 50 96 Q 8 80 8 52 L 8 16 Z"
        fill={`url(#g-${initials})`}
        stroke={secondary}
        strokeWidth="4"
      />
      <path
        d="M 50 4 L 92 16 L 92 28 L 50 16 L 8 28 L 8 16 Z"
        fill={secondary}
        opacity="0.95"
      />
      <text
        x="50" y="68"
        textAnchor="middle"
        fontFamily="Saira Condensed, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize={initials.length > 2 ? 26 : 38}
        fill="#fff"
        stroke={primary}
        strokeWidth="0.5"
      >{initials}</text>
    </svg>
  );
}

// ---------- TEAM PRESETS (placeholder colors only — abstract shields) ----------
const TEAM_PRESETS = {
  HOME: { initials: 'HOM', primary: '#0A254E', secondary: '#E40046', name: 'HOME', city: 'CITY' },
  AWAY: { initials: 'AWY', primary: '#5E0009', secondary: '#FFFFFF', name: 'AWAY', city: 'CITY' },
};

// Export to window for cross-script use
// ---------- NETWORK LOGOS ----------
// Renders the appropriate broadcast logo for the chosen network.
// `theme` = 'dark' (for use on dark backgrounds) or 'light'.
const NETWORKS = {
  'ESPN+':       { dark: 'assets/espn-plus-white.png',  light: 'assets/espn-plus-white.png',  ratioW: 2.2 },
  'ESPN':        { dark: 'assets/espn-black.png',       light: 'assets/espn-red.png',         ratioW: 3.2 },
  'CBSSN':       { dark: 'assets/cbs-on-dark.png',      light: 'assets/cbs-on-light.png',     ratioW: 5.5 },
  'CBS Stacked': { dark: 'assets/cbs-stacked-white.png',light: 'assets/cbs-stacked-blue.png', ratioW: 2.5 },
};

function NetworkLogo({ network = 'ESPN+', theme = 'dark', height = 40, style = {} }) {
  const cfg = NETWORKS[network];
  if (!cfg) {
    // Fallback: just render text label
    return <span style={{ fontFamily: 'Saira Condensed, sans-serif', fontWeight: 800, fontSize: height * 0.7, ...style }}>{network}</span>;
  }
  const src = theme === 'light' ? cfg.light : cfg.dark;
  return (
    <img src={src} alt={network}
         style={{ height, width: 'auto', display: 'block', ...style }} />
  );
}

// ---------- STARK STRIPS BACKGROUND (corner ribbons) ----------
// Decorative corner ribbon graphic (top-right + bottom-left) following CUSA brand pattern.
// Used as an alternative full-screen background.
function StarkStripsBg({ opacity = 1, style = {} }) {
  return (
    <img src="assets/stark-strips.png" alt=""
         style={{
           position: 'absolute', inset: 0, width: '100%', height: '100%',
           objectFit: 'cover', opacity, pointerEvents: 'none', ...style,
         }} />
  );
}

Object.assign(window, { StarkStripsBg });

Object.assign(window, {
  Stark, StarkOutline, StripeMotif, BgPattern,
  SportIcons, SPORTS,
  TeamShield, TEAM_PRESETS,
  NetworkLogo, NETWORKS, StarkStripsBg,
});
