/* ============================================
   MATCHUP GRAPHIC
   Layouts: full | lower-third | left-slab
   ============================================ */

function MatchupFrame({
  layout = 'full',
  sport = 'football',
  accent = '#E40046',
  background = 'navy',
  home, away,
  date = 'SAT • OCT 18',
  time = '7:00 PM CT',
  network = 'ESPN+',
  animKey = 0,
  animState = 'rest',           // 'in' | 'out' | 'rest' | 'hidden'
  showInsiderLogo = true,
  transparent = false,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0,
  networkLogoScale = 1, networkLogoOffsetX = 0, networkLogoOffsetY = 0, networkLogoOnlyScale = 1,
}) {
  const Sport = SportIcons[sport] || SportIcons.football;
  const logoCtl = { schoolLogoScale, schoolLogoOffsetX, schoolLogoOffsetY,
                    networkLogoScale, networkLogoOffsetX, networkLogoOffsetY, networkLogoOnlyScale };

  if (layout === 'lower-third') {
    return (
      <div
        className={`frame-1920 ${transparent ? 'transparent' : ''}`}
        key={animKey}
        style={transparent ? { background: 'transparent' } : {}}
      >
        <LowerThirdMatchup
          sport={sport}
          accent={accent}
          home={home}
          away={away}
          date={date}
          time={time}
          network={network}
          animState={animState}
          {...logoCtl}
        />
      </div>
    );
  }

  if (layout === 'left-slab') {
    return (
      <div
        className={`frame-1920 ${transparent ? 'transparent' : ''}`}
        key={animKey}
        style={transparent ? { background: 'transparent' } : {}}
      >
        <LeftSlabMatchup
          sport={sport}
          accent={accent}
          home={home}
          away={away}
          date={date}
          time={time}
          network={network}
          animState={animState}
          {...logoCtl}
        />
      </div>
    );
  }

  // FULL SCREEN
  // Strips background has a white center → flip to navy text like white bg
  const isLightBg = background === 'white';
  // 'navy' and 'strips' both render dark in the center; only 'white' flips to light
  const bgColor = background === 'white' ? '#ffffff' : 'var(--cusa-navy)';
  const textOnBg = isLightBg ? 'var(--cusa-navy)' : '#fff';
  return (
    <div className="frame-1920" key={animKey} style={{ background: bgColor }}>
      {background === 'navy' && <BgPattern opacity={0.07} />}
      {background === 'strips' && <StarkStripsBg opacity={1} />}

      {/* Top edge stripe motif */}

      {/* CUSA Insider Logo top-left */}
      {showInsiderLogo && (
        <div data-anim className="anim-fadeup" data-anim-state={animState}
             style={{ position: 'absolute', top: 60, left: 80, animationDelay: '0.1s' }}>
          <img src={isLightBg ? "assets/cusa-insider.png" : "assets/cusa-insider-knockout.png"} alt="CUSA Insider" style={{ height: 130, display: 'block' }} />
        </div>
      )}

      {/* Sport label top-right */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', top: 80, right: 100, display: 'flex', alignItems: 'center', gap: 24, animationDelay: '0.2s' }}>
        <Sport size={80} color="#fff" />
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 56, color: '#fff', letterSpacing: '0.04em',
        }}>{(SPORTS.find(s => s.key === sport) || {}).label || 'SPORT'}</div>
      </div>

      {/* Center stark (huge) */}
      <div data-anim className="anim-stark" data-anim-state={animState}
           style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%)', animationDelay: '0.3s' }}>
        <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stark size={420} color={accent} style={{ position: 'absolute', opacity: 0.95 }} />
        </div>
      </div>

      {/* VS badge over the stark */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{
             position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%)',
             zIndex: 3, animationDelay: '0.5s',
           }}>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 220, color: '#fff',
          textShadow: isLightBg ? 'none' : '0 8px 0 rgba(0,0,0,0.25)',
          letterSpacing: '-0.04em',
        }}>VS</div>
      </div>

      {/* Home team — left */}
      <div data-anim className="anim-slab-left" data-anim-state={animState}
           style={{
             position: 'absolute', left: 140 + schoolLogoOffsetX, top: `calc(52% + ${schoolLogoOffsetY}px)`, transform: 'translateY(-50%)',
             display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
             animationDelay: '0.2s',
           }}>
        <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={360 * schoolLogoScale} />
        {home.rank && (
          <div style={{
            position: 'absolute', top: -20, left: -20,
            background: accent, color: '#fff',
            width: 90, height: 90, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic', fontSize: 56,
            border: '4px solid #fff',
          }}>#{home.rank}</div>
        )}
      </div>
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{
             position: 'absolute', left: 80, top: 'calc(52% + 240px)', width: 480, textAlign: 'center',
             animationDelay: '0.4s',
           }}>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 84, color: '#fff', letterSpacing: '0.01em', lineHeight: 0.95,
        }}>{home.name}</div>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 700, fontSize: 36, color: isLightBg ? '#5a6270' : 'var(--cusa-gray)', marginTop: 8,
          letterSpacing: '0.06em',
        }}>{home.record}</div>
      </div>

      {/* Away team — right */}
      <div data-anim className="anim-slab-right" data-anim-state={animState}
           style={{
             position: 'absolute', right: 140 - schoolLogoOffsetX, top: `calc(52% + ${schoolLogoOffsetY}px)`, transform: 'translateY(-50%)',
             display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
             animationDelay: '0.2s',
           }}>
        <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={360 * schoolLogoScale} />
        {away.rank && (
          <div style={{
            position: 'absolute', top: -20, right: -20,
            background: accent, color: '#fff',
            width: 90, height: 90, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic', fontSize: 56,
            border: '4px solid #fff',
          }}>#{away.rank}</div>
        )}
      </div>
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{
             position: 'absolute', right: 80, top: 'calc(52% + 240px)', width: 480, textAlign: 'center',
             animationDelay: '0.4s',
           }}>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 84, color: '#fff', letterSpacing: '0.01em', lineHeight: 0.95,
        }}>{away.name}</div>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 700, fontSize: 36, color: isLightBg ? '#5a6270' : 'var(--cusa-gray)', marginTop: 8,
          letterSpacing: '0.06em',
        }}>{away.record}</div>
      </div>

      {/* Date / time / network bar at bottom */}
      <div data-anim className="anim-wipe-left" data-anim-state={animState}
           style={{
             position: 'absolute', bottom: 60 - networkLogoOffsetY, left: `calc(50% + ${networkLogoOffsetX}px)`, transform: 'translateX(-50%)',
             display: 'flex', alignItems: 'center', gap: 0,
             animationDelay: '0.6s',
           }}>
        <div style={{
          background: '#fff', color: 'var(--cusa-navy)',
          padding: `${18 * networkLogoScale}px ${44 * networkLogoScale}px`,
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 800, fontSize: 38 * networkLogoScale, letterSpacing: '0.08em',
        }}>{date}</div>
        <div style={{
          background: accent, color: '#fff',
          padding: `${18 * networkLogoScale}px ${44 * networkLogoScale}px`,
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 800, fontSize: 38 * networkLogoScale, letterSpacing: '0.08em',
        }}>{time}</div>
        <div style={{
          background: 'var(--cusa-navy)', color: '#fff',
          padding: `${12 * networkLogoScale}px ${28 * networkLogoScale}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80 * networkLogoScale,
          border: '2px solid #fff',
        }}><NetworkLogo network={network} theme="dark" height={42 * networkLogoScale * networkLogoOnlyScale} /></div>
      </div>
    </div>
  );
}

// ---------- LOWER-THIRD MATCHUP ----------
function LowerThirdMatchup({ sport, accent, home, away, date, time, network, animState,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0,
  networkLogoScale = 1, networkLogoOffsetX = 0, networkLogoOffsetY = 0, networkLogoOnlyScale = 1, }) {
  const Sport = SportIcons[sport] || SportIcons.football;
  return (
    <>
      {/* The lower-third occupies bottom ~28% of the 1080 frame */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320 }}>
        {/* Diagonal stripe accent at far right */}

        {/* Main slab */}
        <div data-anim className="anim-slab-left" data-anim-state={animState}
             style={{
               position: 'absolute', left: 80, bottom: 60,
               display: 'flex', alignItems: 'stretch',
               filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.4))',
             }}>
          {/* Sport icon tile */}
          <div style={{
            background: accent, width: 180, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 16% 100%)',
            paddingLeft: 24,
          }}>
            <Sport size={96} color="#fff" />
          </div>

          {/* Home team plate */}
          <div className="slab-plate" style={{
            background: 'linear-gradient(180deg, #E2E8EC 0%, #C9D5DC 100%)',
            display: 'flex', alignItems: 'center', gap: 28,
            padding: '20px 40px 20px 32px', minWidth: 540, position: 'relative',
          }}>
            <div style={{ position: 'relative', transform: `translate(${schoolLogoOffsetX}px, ${schoolLogoOffsetY}px)` }}>
              <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={140 * schoolLogoScale} />
              {home.rank && (
                <div style={{
                  position: 'absolute', top: -8, left: -8,
                  background: 'var(--cusa-navy)', color: '#fff',
                  width: 50, height: 50, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 28,
                  border: '3px solid #fff',
                }}>#{home.rank}</div>
              )}
            </div>
            <div>
              <Slot id="lt-home-name" label="Home Team Name" defaultText={home.name} defaultColor="#00263A" defaultFontSize={76} edits={['text','color','fontSize']}>
                {({ text, style }) => <div style={{
                  fontFamily: 'Saira Condensed, sans-serif',
                  fontWeight: 900, fontStyle: 'italic',
                  fontSize: 76, color: 'var(--cusa-navy)', lineHeight: 0.9,
                  ...style,
                }}>{text}</div>}
              </Slot>
              <Slot id="lt-home-record" label="Home Record" defaultText={home.record} defaultColor="#00263A" defaultFontSize={28} edits={['text','color','fontSize']}>
                {({ text, style }) => <div style={{
                  fontFamily: 'Saira Condensed, sans-serif',
                  fontWeight: 700, fontSize: 28, color: 'var(--cusa-navy)', marginTop: 6,
                  letterSpacing: '0.08em', opacity: 0.75,
                  ...style,
                }}>{text}</div>}
              </Slot>
            </div>
          </div>

          {/* VS chunk */}
          <div style={{
            background: 'var(--cusa-navy)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 28px', position: 'relative',
          }}>
            <div style={{
              fontFamily: 'Saira Condensed, sans-serif',
              fontWeight: 900, fontStyle: 'italic', fontSize: 92,
              color: accent,
            }}>VS</div>
          </div>

          {/* Away team plate */}
          <div className="slab-plate" style={{
            background: 'linear-gradient(180deg, #E2E8EC 0%, #C9D5DC 100%)',
            display: 'flex', alignItems: 'center', gap: 28,
            padding: '20px 32px 20px 40px', minWidth: 540, position: 'relative',
          }}>
            <div>
              <Slot id="lt-away-name" label="Away Team Name" defaultText={away.name} defaultColor="#00263A" defaultFontSize={76} edits={['text','color','fontSize']}>
                {({ text, style }) => <div style={{
                  fontFamily: 'Saira Condensed, sans-serif',
                  fontWeight: 900, fontStyle: 'italic',
                  fontSize: 76, color: 'var(--cusa-navy)', lineHeight: 0.9, textAlign: 'right',
                  ...style,
                }}>{text}</div>}
              </Slot>
              <Slot id="lt-away-record" label="Away Record" defaultText={away.record} defaultColor="#00263A" defaultFontSize={28} edits={['text','color','fontSize']}>
                {({ text, style }) => <div style={{
                  fontFamily: 'Saira Condensed, sans-serif',
                  fontWeight: 700, fontSize: 28, color: 'var(--cusa-navy)', marginTop: 6,
                  letterSpacing: '0.08em', opacity: 0.75, textAlign: 'right',
                  ...style,
                }}>{text}</div>}
              </Slot>
            </div>
            <div style={{ position: 'relative', transform: `translate(${-schoolLogoOffsetX}px, ${schoolLogoOffsetY}px)` }}>
              <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={140 * schoolLogoScale} />
              {away.rank && (
                <div style={{
                  position: 'absolute', top: -8, right: -8,
                  background: 'var(--cusa-navy)', color: '#fff',
                  width: 50, height: 50, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 28,
                  border: '3px solid #fff',
                }}>#{away.rank}</div>
              )}
            </div>
          </div>
        </div>

        {/* Sub strip — date / time / network */}
        <div data-anim className="anim-wipe-left" data-anim-state={animState}
             style={{
               position: 'absolute', left: 260 + networkLogoOffsetX, bottom: 24 - networkLogoOffsetY,
               display: 'flex', alignItems: 'center',
               animationDelay: '0.45s',
             }}>
          <div style={{
            background: 'var(--cusa-navy)', color: '#fff',
            padding: `${8 * networkLogoScale}px ${28 * networkLogoScale}px`,
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 800, fontSize: 24 * networkLogoScale, letterSpacing: '0.1em',
          }}>{date} · {time}</div>
          <div style={{
            background: accent, color: '#fff',
            padding: `${6 * networkLogoScale}px ${22 * networkLogoScale}px`,
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 38 * networkLogoScale,
          }}><NetworkLogo network={network} theme="dark" height={22 * networkLogoScale * networkLogoOnlyScale} /></div>
        </div>
      </div>
    </>
  );
}

// ---------- LEFT-SLAB MATCHUP ----------
function LeftSlabMatchup({ sport, accent, home, away, date, time, network, animState,
  schoolLogoScale = 1, schoolLogoOffsetX = 0, schoolLogoOffsetY = 0,
  networkLogoScale = 1, networkLogoOffsetX = 0, networkLogoOffsetY = 0, networkLogoOnlyScale = 1, }) {
  const Sport = SportIcons[sport] || SportIcons.football;
  return (
    <>
      {/* Background fill panel */}
      <div data-anim className="anim-slab-left" data-anim-state={animState}
           style={{
             position: 'absolute', left: 0, top: 0, bottom: 0, width: 620,
             background: 'linear-gradient(180deg, #002F47 0%, #00263A 100%)',
             borderRight: `8px solid ${accent}`,
             filter: 'drop-shadow(8px 0 24px rgba(0,0,0,0.5))',
           }}>
        <BgPattern opacity={0.06} />

      </div>

      {/* Sport label */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, top: 100, animationDelay: '0.2s',
                    display: 'flex', alignItems: 'center', gap: 16 }}>
        <Sport size={56} color="#fff" />
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: 36, color: '#fff', letterSpacing: '0.06em',
        }}>{(SPORTS.find(s => s.key === sport) || {}).label}</div>
      </div>

      {/* HOME */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60 + schoolLogoOffsetX, top: 200 + schoolLogoOffsetY, animationDelay: '0.3s',
                    display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ position: 'relative' }}>
          <TeamShield tri={home.tri} initials={home.initials} primary={home.primary} secondary={home.secondary} size={180 * schoolLogoScale} />
          {home.rank && (
            <div style={{
              position: 'absolute', top: -10, left: -10,
              background: accent, color: '#fff',
              width: 60, height: 60, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 32,
              border: '3px solid #fff',
            }}>#{home.rank}</div>
          )}
        </div>
        <div>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 72, color: '#fff', lineHeight: 0.9,
          }}>{home.name}</div>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 700, fontSize: 26, color: 'var(--cusa-gray)', marginTop: 6,
            letterSpacing: '0.08em',
          }}>{home.record}</div>
        </div>
      </div>

      {/* VS */}
      <div data-anim className="anim-stark" data-anim-state={animState}
           style={{ position: 'absolute', left: 90, top: 460, animationDelay: '0.45s' }}>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: 96, color: accent, lineHeight: 0.8,
        }}>VS</div>
      </div>

      {/* AWAY */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60 + schoolLogoOffsetX, top: 600 + schoolLogoOffsetY, animationDelay: '0.55s',
                    display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ position: 'relative' }}>
          <TeamShield tri={away.tri} initials={away.initials} primary={away.primary} secondary={away.secondary} size={180 * schoolLogoScale} />
          {away.rank && (
            <div style={{
              position: 'absolute', top: -10, left: -10,
              background: accent, color: '#fff',
              width: 60, height: 60, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Saira Condensed, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 32,
              border: '3px solid #fff',
            }}>#{away.rank}</div>
          )}
        </div>
        <div>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 900, fontStyle: 'italic',
            fontSize: 72, color: '#fff', lineHeight: 0.9,
          }}>{away.name}</div>
          <div style={{
            fontFamily: 'Saira Condensed, sans-serif',
            fontWeight: 700, fontSize: 26, color: 'var(--cusa-gray)', marginTop: 6,
            letterSpacing: '0.08em',
          }}>{away.record}</div>
        </div>
      </div>

      {/* Date / time / network */}
      <div data-anim className="anim-wipe-left" data-anim-state={animState}
           style={{
             position: 'absolute', left: 60 + networkLogoOffsetX, bottom: 100 - networkLogoOffsetY,
             animationDelay: '0.7s',
           }}>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 800, fontSize: 30 * networkLogoScale, color: '#fff', letterSpacing: '0.08em',
        }}>{date}</div>
        <div style={{
          fontFamily: 'Saira Condensed, sans-serif',
          fontWeight: 900, fontStyle: 'italic',
          fontSize: 56 * networkLogoScale, color: accent, letterSpacing: '0.04em', lineHeight: 1, marginTop: 4,
        }}>{time}</div>
        <div style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center',
          background: '#fff',
          padding: `${8 * networkLogoScale}px ${18 * networkLogoScale}px`,
        }}><NetworkLogo network={network} theme="light" height={26 * networkLogoScale * networkLogoOnlyScale} /></div>
      </div>

      {/* CUSA stacked logo bottom-left */}
      <div data-anim className="anim-fadeup" data-anim-state={animState}
           style={{ position: 'absolute', left: 60, bottom: 30, animationDelay: '0.85s' }}>
        <img src="assets/cusa-stacked-white.png" alt="CUSA" style={{ height: 50, opacity: 0.7 }} />
      </div>
    </>
  );
}

Object.assign(window, { MatchupFrame });
