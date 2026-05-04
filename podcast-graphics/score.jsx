/* ============================================
   FINAL SCORE GRAPHIC
   Layouts: full | lower-third | left-slab
   ============================================ */

function ScoreFrame({
  layout = 'full',
  sport = 'football',
  accent = '#E40046',
  background = 'navy',
  home, away,
  homeScore = 27,
  awayScore = 24,
  animKey = 0,
  animState = 'rest',
  showInsiderLogo = true,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0,
  networkLogoScale = 1, networkLogoOffsetX = 0, networkLogoOffsetY = 0, networkLogoOnlyScale = 1,
}) {
  const logoCtl = { schoolLogoScale, schoolLogoOffsetX, schoolLogoOffsetY };
  if (layout === 'lower-third') {
    return (
      <div className="frame-1920" key={animKey} style={{ background: 'transparent' }}>
        <LowerThirdScore sport={sport} accent={accent} home={home} away={away}
                         homeScore={homeScore} awayScore={awayScore} animState={animState} {...logoCtl} />
      </div>
    );
  }
  if (layout === 'left-slab') {
    return (
      <div className="frame-1920" key={animKey} style={{ background: 'transparent' }}>
        <LeftSlabScore sport={sport} accent={accent} home={home} away={away}
                       homeScore={homeScore} awayScore={awayScore} animState={animState} {...logoCtl} />
      </div>
    );
  }

  // FULL SCREEN SCORE
  const Sport = SportIcons[sport] || SportIcons.football;
  const homeWon = homeScore > awayScore;
  const tied = homeScore === awayScore;
  const isLightBg = background === 'white';
  // 'navy' and 'strips' both render dark in the center; only 'white' flips to light
  const bgColor = background === 'white' ? '#ffffff' : 'var(--cusa-navy)';
  const textOnBg = isLightBg ? 'var(--cusa-navy)' : '#fff';

  return (
    <div className="frame-1920" key={animKey} style={{ background: bgColor }}>
      {background === 'navy' && <BgPattern opacity={0.07} />}
      {background === 'strips' && <StarkStripsBg opacity={1} />}

      {/* Corner stripes */}

      {showInsiderLogo && (
        <div data-anim className="anim-fadeup" data-anim-state={animState}
             style={{ position: 'absolute', top: 60, left: 80, animationDelay: '0.1s' }}>
          <img src={isLightBg ? "assets/cusa-insider.png" : "assets/cusa-insider-knockout.png"} alt="CUSA Insider" style={{ height: 110, display: 'block' }} />
        </div>
      )}

      {/* FINAL stamp top-right */}
      <div data-anim className="anim-final" data-anim-state={animState}
           style={{ position: 'absolute', top: 100, right: 120, animationDelay: '0.4s', transformOrigin: 'center' }}>
        <div style={{
          background: accent, color: '#fff',
          padding: '14px 50px',
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 80, letterSpacing: '0.12em',
          border: '4px solid #fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          transform: 'rotate(-8deg)',
        }}>FINAL</div>
      </div>

      {/* HOME side */}
      <div style={{ position: 'absolute', left: 0, top: 240, width: 960, height: 720,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div data-anim className="anim-slab-left" data-anim-state={animState}
             style={{ animationDelay: '0.2s' }}>
          <div style={{ position: 'relative', transform: `translate(${schoolLogoOffsetX}px, ${schoolLogoOffsetY}px)` }}>
            <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={300 * schoolLogoScale} />
            {!tied && homeWon && (
              <div style={{
                position: 'absolute', top: -16, right: -30,
                background: 'var(--cusa-green)', color: 'var(--cusa-navy)',
                padding: '8px 22px', fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic', fontSize: 36, letterSpacing: '0.08em',
                border: '3px solid #fff', transform: 'rotate(8deg)',
              }}>WIN</div>
            )}
          </div>
        </div>
        <div data-anim className="anim-fadeup" data-anim-state={animState}
             style={{ animationDelay: '0.3s', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 72, color: '#fff', lineHeight: 0.9,
          }}>{home.name}</div>
        </div>
        <div data-anim className="anim-score" data-anim-state={animState}
             style={{ animationDelay: '0.5s' }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 280, color: homeWon || tied ? '#fff' : 'rgba(255,255,255,0.55)',
            lineHeight: 0.85, fontVariantNumeric: 'tabular-nums',
            textShadow: homeWon ? `0 0 40px ${accent}80` : 'none',
          }}>{homeScore}</div>
        </div>
      </div>

      {/* Center divider — big stark */}
      <div data-anim className="anim-stark" data-anim-state={animState}
           style={{
             position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%)',
             animationDelay: '0.35s',
           }}>
        <Stark size={220} color={accent} />
      </div>

      {/* AWAY side */}
      <div style={{ position: 'absolute', right: 0, top: 240, width: 960, height: 720,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <div data-anim className="anim-slab-right" data-anim-state={animState}
             style={{ animationDelay: '0.2s' }}>
          <div style={{ position: 'relative', transform: `translate(${-schoolLogoOffsetX}px, ${schoolLogoOffsetY}px)` }}>
            <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={300 * schoolLogoScale} />
            {!tied && !homeWon && (
              <div style={{
                position: 'absolute', top: -16, left: -30,
                background: 'var(--cusa-green)', color: 'var(--cusa-navy)',
                padding: '8px 22px', fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic', fontSize: 36, letterSpacing: '0.08em',
                border: '3px solid #fff', transform: 'rotate(-8deg)',
              }}>WIN</div>
            )}
          </div>
        </div>
        <div data-anim className="anim-fadeup" data-anim-state={animState}
             style={{ animationDelay: '0.3s', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 72, color: '#fff', lineHeight: 0.9,
          }}>{away.name}</div>
        </div>
        <div data-anim className="anim-score" data-anim-state={animState}
             style={{ animationDelay: '0.5s' }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 280, color: !homeWon || tied ? '#fff' : 'rgba(255,255,255,0.55)',
            lineHeight: 0.85, fontVariantNumeric: 'tabular-nums',
            textShadow: !homeWon && !tied ? `0 0 40px ${accent}80` : 'none',
          }}>{awayScore}</div>
        </div>
      </div>

      {/* Sport label bottom */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 18, animationDelay: '0.7s' }}>
        <Sport size={56} color="#fff" />
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: 40, color: '#fff', letterSpacing: '0.08em',
        }}>{(SPORTS.find(s => s.key === sport) || {}).label}</div>
      </div>
    </div>
  );
}

// ---------- LOWER-THIRD SCORE ----------
function LowerThirdScore({ sport, accent, home, away, homeScore, awayScore, animState,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0 }) {
  const Sport = SportIcons[sport] || SportIcons.football;
  const homeWon = homeScore > awayScore;
  const tied = homeScore === awayScore;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }}>
      {/* Stripe accent */}

      <div data-anim className="anim-slab-left" data-anim-state={animState}
           style={{
             position: 'absolute', left: 80, bottom: 60,
             display: 'flex', alignItems: 'stretch',
             filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.4))',
           }}>
        {/* FINAL stamp */}
        <div style={{
          background: accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 28px', minWidth: 140,
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic', fontSize: 44, letterSpacing: '0.1em',
          clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0% 100%)',
          paddingRight: 50,
        }}>FINAL</div>

        {/* HOME row */}
        <div style={{
          background: 'linear-gradient(180deg, #E2E8EC 0%, #C9D5DC 100%)',
          display: 'flex', alignItems: 'center', gap: 22,
          padding: '14px 28px', minWidth: 540,
          borderBottom: tied ? 'none' : (homeWon ? `5px solid var(--cusa-green)` : `5px solid transparent`),
        }}>
          <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={100 * schoolLogoScale} />
          <div style={{ flex: 1 }}>
            <Slot id="lt-score-home-name" label="Home Name (Score)" defaultText={home.name} defaultColor="#00263A" defaultFontSize={60} edits={['text','color','fontSize']}>
              {({ text, style }) => <div style={{
                fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic',
                fontSize: 60, color: 'var(--cusa-navy)', lineHeight: 0.9,
                ...style,
              }}>{text}</div>}
            </Slot>
          </div>
          <Slot id="lt-score-home-score" label="Home Score" defaultText={String(homeScore)} defaultColor="#00263A" defaultFontSize={110} edits={['text','color','fontSize']}>
            {({ text, style }) => <div data-anim className="anim-score" data-anim-state={animState}
                 style={{
                   fontFamily: 'Saira Condensed, sans-serif',
                   fontWeight: 900, fontStyle: 'italic',
                   fontSize: 110, color: 'var(--cusa-navy)', lineHeight: 0.85,
                   fontVariantNumeric: 'tabular-nums', minWidth: 120, textAlign: 'right',
                   animationDelay: '0.4s',
                   ...style,
                 }}>{text}</div>}
          </Slot>
        </div>

        {/* Sport divider */}
        <div style={{
          background: 'var(--cusa-navy)', width: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sport size={56} color="#fff" />
        </div>

        {/* AWAY row */}
        <div style={{
          background: 'linear-gradient(180deg, #E2E8EC 0%, #C9D5DC 100%)',
          display: 'flex', alignItems: 'center', gap: 22,
          padding: '14px 28px', minWidth: 540,
          borderBottom: tied ? 'none' : (!homeWon ? `5px solid var(--cusa-green)` : `5px solid transparent`),
        }}>
          <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={100 * schoolLogoScale} />
          <div style={{ flex: 1 }}>
            <Slot id="lt-score-away-name" label="Away Name (Score)" defaultText={away.name} defaultColor="#00263A" defaultFontSize={60} edits={['text','color','fontSize']}>
              {({ text, style }) => <div style={{
                fontFamily: 'Saira Condensed, sans-serif',
                fontWeight: 900, fontStyle: 'italic',
                fontSize: 60, color: 'var(--cusa-navy)', lineHeight: 0.9,
                ...style,
              }}>{text}</div>}
            </Slot>
          </div>
          <Slot id="lt-score-away-score" label="Away Score" defaultText={String(awayScore)} defaultColor="#00263A" defaultFontSize={110} edits={['text','color','fontSize']}>
            {({ text, style }) => <div data-anim className="anim-score" data-anim-state={animState}
                 style={{
                   fontFamily: 'Saira Condensed, sans-serif',
                   fontWeight: 900, fontStyle: 'italic',
                   fontSize: 110, color: 'var(--cusa-navy)', lineHeight: 0.85,
                   fontVariantNumeric: 'tabular-nums', minWidth: 120, textAlign: 'right',
                   animationDelay: '0.55s',
                   ...style,
                 }}>{text}</div>}
          </Slot>
        </div>
      </div>
    </div>
  );
}

// ---------- LEFT-SLAB SCORE ----------
function LeftSlabScore({ sport, accent, home, away, homeScore, awayScore, animState,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0 }) {
  const Sport = SportIcons[sport] || SportIcons.football;
  const homeWon = homeScore > awayScore;
  const tied = homeScore === awayScore;
  return (
    <>
      <div data-anim className="anim-slab-left" data-anim-state={animState}
           style={{
             position: 'absolute', left: 0, top: 0, bottom: 0, width: 620,
             background: 'linear-gradient(180deg, #002F47 0%, #00263A 100%)',
             borderRight: `8px solid ${accent}`,
             filter: 'drop-shadow(8px 0 24px rgba(0,0,0,0.5))',
           }}>
        <BgPattern opacity={0.06} />
      </div>

      {/* FINAL + sport */}
      <div data-anim className="anim-final" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, top: 90, animationDelay: '0.4s' }}>
        <div style={{
          background: accent, color: '#fff', padding: '8px 24px',
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 44, letterSpacing: '0.12em',
          border: '3px solid #fff', display: 'inline-block',
        }}>FINAL</div>
      </div>
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, top: 175, animationDelay: '0.5s',
                    display: 'flex', alignItems: 'center', gap: 14 }}>
        <Sport size={42} color="#fff" />
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif', fontWeight: 800,
          fontSize: 28, color: 'var(--cusa-gray)', letterSpacing: '0.08em',
        }}>{(SPORTS.find(s => s.key === sport) || {}).label}</div>
      </div>

      {/* HOME row */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, top: 280, animationDelay: '0.3s',
                    display: 'flex', alignItems: 'center', gap: 24,
                    width: 540 }}>
        <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={130 * schoolLogoScale} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 56, color: '#fff', lineHeight: 0.9,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{home.name}</div>
        </div>
        <div data-anim className="anim-score" data-anim-state={animState}
             style={{
               fontFamily: 'Saira Condensed, sans-serif',
               fontWeight: 900, fontStyle: 'italic',
               fontSize: 130, color: homeWon || tied ? '#fff' : 'rgba(255,255,255,0.5)',
               lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', minWidth: 140, textAlign: 'right',
               animationDelay: '0.5s',
             }}>{homeScore}</div>
      </div>

      {/* divider */}
      <div style={{
        position: 'absolute', left: 80, top: 470,
        width: 480, height: 4, background: accent, opacity: 0.5,
      }} />

      {/* AWAY row */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, top: 510, animationDelay: '0.55s',
                    display: 'flex', alignItems: 'center', gap: 24,
                    width: 540 }}>
        <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={130 * schoolLogoScale} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 56, color: '#fff', lineHeight: 0.9,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{away.name}</div>
        </div>
        <div data-anim className="anim-score" data-anim-state={animState}
             style={{
               fontFamily: 'Saira Condensed, sans-serif',
               fontWeight: 900, fontStyle: 'italic',
               fontSize: 130, color: !homeWon || tied ? '#fff' : 'rgba(255,255,255,0.5)',
               lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', minWidth: 140, textAlign: 'right',
               animationDelay: '0.7s',
             }}>{awayScore}</div>
      </div>

      {/* Winner badge */}
      {!tied && (
        <div data-anim className="anim-final" data-anim-state={animState}
             style={{ position: 'absolute', left: 60, top: homeWon ? 380 : 610, animationDelay: '0.85s' }}>
          <div style={{
            background: 'var(--cusa-green)', color: 'var(--cusa-navy)',
            padding: '4px 14px',
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic', fontSize: 22, letterSpacing: '0.1em',
            transform: 'rotate(-6deg)', display: 'inline-block',
            border: '2px solid var(--cusa-navy)',
          }}>WINNER</div>
        </div>
      )}

      {/* CUSA stacked */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, bottom: 60, animationDelay: '0.95s' }}>
        <img src="assets/cusa-stacked-white.png" alt="CUSA" style={{ height: 50, opacity: 0.7 }} />
      </div>
    </>
  );
}

Object.assign(window, { ScoreFrame });
