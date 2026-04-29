/**
 * IsometricScene — animated residence building illustration for the Login page.
 * Pure SVG + CSS, no external dependencies.
 *
 * Coordinate system:
 *   TILE_W=90  TILE_H=45  BLOCK_H=48
 *   CX=200     CY=295     viewBox="0 0 400 420"
 *
 * Draw order (painter's algorithm, back → front):
 *   Block D (1,1 dark navy, 4 floors)
 *   Block C (0,1 amber,     3 floors)
 *   Block B (1,0 rose,      3 floors)
 *   Block A (0,0 cyan,      5 floors)  ← tallest, front-left
 */

const ANIM = `
  @keyframes isoFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-9px); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: .45; transform: scale(1);   }
    50%       { opacity: 1;   transform: scale(1.6); }
  }
  @keyframes lineDash { to { stroke-dashoffset: -24; } }
  @keyframes particleFade {
    0%, 100% { opacity: .15; }
    50%       { opacity: .55; }
  }

  .iso-a { animation: isoFloat 3.2s ease-in-out infinite; }
  .iso-b { animation: isoFloat 3.9s ease-in-out infinite .5s; }
  .iso-c { animation: isoFloat 4.3s ease-in-out infinite 1.1s; }
  .iso-d { animation: isoFloat 3.6s ease-in-out infinite 1.8s; }

  .gp    { animation: glowPulse 2.4s ease-in-out infinite; }
  .gp-b  { animation: glowPulse 2.4s ease-in-out infinite  .8s; }
  .gp-c  { animation: glowPulse 2.4s ease-in-out infinite 1.6s; }
  .gp-d  { animation: glowPulse 2.4s ease-in-out infinite 2.0s; }

  .ld    { stroke-dasharray: 5 5; animation: lineDash 1.8s linear infinite; }
  .ld-b  { stroke-dasharray: 5 5; animation: lineDash 2.2s linear infinite .4s; }

  .pf-1  { animation: particleFade 3.1s ease-in-out infinite; }
  .pf-2  { animation: particleFade 4.2s ease-in-out infinite .7s; }
  .pf-3  { animation: particleFade 2.8s ease-in-out infinite 1.4s; }
  .pf-4  { animation: particleFade 3.7s ease-in-out infinite 2.1s; }
  .pf-5  { animation: particleFade 5.0s ease-in-out infinite  .3s; }
  .pf-6  { animation: particleFade 3.4s ease-in-out infinite 1.9s; }
`;

export default function IsometricScene() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '40px 24px',
    }}>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #00CCCC, #009999)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0,204,204,.45)',
          }}>
            <span style={{ fontSize: 18 }}>🏢</span>
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: '#00CCCC',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-.04em', lineHeight: 1,
            textShadow: '0 0 24px rgba(0,204,204,.5)',
          }}>
            ResiHub
          </h1>
        </div>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: 'rgba(255,255,255,.3)',
          letterSpacing: '.12em', textTransform: 'uppercase',
        }}>
          Student Accommodation Platform
        </p>
      </div>

      {/* ── SVG Scene ─────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 420"
        style={{ width: '100%', maxWidth: 380, overflow: 'visible' }}
        aria-hidden="true"
      >
        <style>{ANIM}</style>

        <defs>
          {/* Glow filters */}
          <filter id="gc" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="gr" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ga" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="gsoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Background particles ─────────────────────── */}
        <circle cx="28"  cy="72"  r="1.5" fill="#00CCCC" className="pf-1"/>
        <circle cx="358" cy="55"  r="2"   fill="#00CCCC" className="pf-2"/>
        <circle cx="18"  cy="195" r="1.5" fill="#E8197A" className="pf-3"/>
        <circle cx="372" cy="155" r="2"   fill="#F59E0B" className="pf-4"/>
        <circle cx="42"  cy="340" r="1.5" fill="#00CCCC" className="pf-5"/>
        <circle cx="378" cy="285" r="1.5" fill="#E8197A" className="pf-6"/>
        <circle cx="95"  cy="28"  r="1.2" fill="#00CCCC" className="pf-2"/>
        <circle cx="308" cy="32"  r="1.2" fill="#F59E0B" className="pf-1"/>
        <circle cx="340" cy="395" r="1.5" fill="#00CCCC" className="pf-4"/>
        <circle cx="62"  cy="390" r="1.2" fill="#F59E0B" className="pf-3"/>

        {/* ── Subtle grid dots ─────────────────────────── */}
        {[120,160,200,240,280].map(x =>
          [200,240,280,320,360].map(y => (
            <circle key={`${x},${y}`} cx={x} cy={y} r=".8" fill="rgba(255,255,255,.04)"/>
          ))
        )}

        {/* ── Platform slab ────────────────────────────── */}
        {/* top diamond */}
        <polygon
          points="200,282 308,333 200,393 92,333"
          fill="#152338"
          stroke="rgba(0,204,204,.1)" strokeWidth=".5"
        />
        {/* left slab face */}
        <polygon points="92,333 200,393 200,410 92,350"  fill="#0a1625"/>
        {/* right slab face */}
        <polygon points="200,393 308,333 308,350 200,410" fill="#111e2f"/>
        {/* highlight rim */}
        <line x1="92"  y1="333" x2="308" y2="333" stroke="rgba(0,204,204,.12)" strokeWidth=".8"/>
        <line x1="92"  y1="333" x2="200" y2="393" stroke="rgba(0,204,204,.06)" strokeWidth=".5"/>
        <line x1="308" y1="333" x2="200" y2="393" stroke="rgba(0,204,204,.06)" strokeWidth=".5"/>

        {/* ── Small server/device block (far left) ─────── */}
        <g>
          {/* top */}
          <polygon points="72,212 87,220 72,227 57,220" fill="#1E3455"/>
          {/* left face */}
          <polygon points="57,220 72,227 72,287 57,280" fill="#0F1F33"/>
          {/* right face */}
          <polygon points="72,227 87,220 87,280 72,287" fill="#162840"/>
          {/* LED dots */}
          <circle cx="64" cy="244" r="2.5" fill="#00CCCC" filter="url(#gc)" className="pf-1"/>
          <circle cx="64" cy="258" r="2.5" fill="#E8197A" filter="url(#gr)" className="pf-3"/>
          <circle cx="64" cy="272" r="2.5" fill="#F59E0B" filter="url(#ga)" className="pf-5"/>
          {/* horizontal stripes */}
          <line x1="57" y1="250" x2="87" y2="234" stroke="rgba(255,255,255,.06)" strokeWidth=".6"/>
          <line x1="57" y1="264" x2="87" y2="248" stroke="rgba(255,255,255,.06)" strokeWidth=".6"/>
        </g>

        {/* ═══════════════════════════════════════════════
            BLOCK D — Dark Navy  (1,1)  4 floors
            sx=200  sy=340  h=192
            Top:   (200,148)(245,170.5)(200,193)(155,170.5)
            Left:  (155,170.5)(200,193)(200,385)(155,362.5)
            Right: (200,193)(245,170.5)(245,362.5)(200,385)
            ═══════════════════════════════════════════════ */}
        <g className="iso-d">
          {/* left face */}
          <polygon points="155,170.5 200,193 200,385 155,362.5" fill="#1a2c42"/>
          {/* right face */}
          <polygon points="200,193 245,170.5 245,362.5 200,385" fill="#213650"/>
          {/* top face */}
          <polygon
            points="200,148 245,170.5 200,193 155,170.5"
            fill="#2E4A6E"
            stroke="rgba(0,204,204,.2)" strokeWidth=".8"
          />
          {/* floor dividers left */}
          <line x1="155" y1="218.5" x2="200" y2="241"   stroke="rgba(255,255,255,.06)" strokeWidth=".7"/>
          <line x1="155" y1="266.5" x2="200" y2="289"   stroke="rgba(255,255,255,.06)" strokeWidth=".7"/>
          <line x1="155" y1="314.5" x2="200" y2="337"   stroke="rgba(255,255,255,.06)" strokeWidth=".7"/>
          {/* floor dividers right */}
          <line x1="200" y1="241"   x2="245" y2="218.5" stroke="rgba(255,255,255,.04)" strokeWidth=".7"/>
          <line x1="200" y1="289"   x2="245" y2="266.5" stroke="rgba(255,255,255,.04)" strokeWidth=".7"/>
          <line x1="200" y1="337"   x2="245" y2="314.5" stroke="rgba(255,255,255,.04)" strokeWidth=".7"/>
          {/* windows left */}
          <rect x="163" y="202" width="7" height="5" rx="1" fill="rgba(100,180,255,.18)"/>
          <rect x="178" y="209" width="7" height="5" rx="1" fill="rgba(100,180,255,.18)"/>
          <rect x="163" y="250" width="7" height="5" rx="1" fill="rgba(100,180,255,.18)"/>
          <rect x="178" y="257" width="7" height="5" rx="1" fill="rgba(100,180,255,.18)"/>
          <rect x="163" y="298" width="7" height="5" rx="1" fill="rgba(100,180,255,.12)"/>
          <rect x="178" y="305" width="7" height="5" rx="1" fill="rgba(100,180,255,.12)"/>
          {/* windows right */}
          <rect x="210" y="202" width="7" height="5" rx="1" fill="rgba(100,180,255,.12)"/>
          <rect x="226" y="195" width="7" height="5" rx="1" fill="rgba(100,180,255,.12)"/>
          <rect x="210" y="250" width="7" height="5" rx="1" fill="rgba(100,180,255,.10)"/>
          <rect x="226" y="243" width="7" height="5" rx="1" fill="rgba(100,180,255,.10)"/>
        </g>

        {/* ═══════════════════════════════════════════════
            BLOCK C — Amber  (0,1)  3 floors
            sx=155  sy=317.5  h=144
            Top:   (155,173.5)(200,196)(155,218.5)(110,196)
            Left:  (110,196)(155,218.5)(155,362.5)(110,340)
            Right: (155,218.5)(200,196)(200,340)(155,362.5)
            ═══════════════════════════════════════════════ */}
        <g className="iso-c">
          {/* left face */}
          <polygon points="110,196 155,218.5 155,362.5 110,340" fill="#8B5E00"/>
          {/* right face */}
          <polygon points="155,218.5 200,196 200,340 155,362.5" fill="#A87300"/>
          {/* top face */}
          <polygon
            points="155,173.5 200,196 155,218.5 110,196"
            fill="#F59E0B"
            stroke="rgba(255,200,0,.3)" strokeWidth=".8"
          />
          {/* top face highlight */}
          <polygon points="155,173.5 200,196 155,218.5 110,196" fill="rgba(255,255,255,.06)"/>
          {/* floor dividers */}
          <line x1="110" y1="244"   x2="155" y2="266.5" stroke="rgba(255,255,255,.08)" strokeWidth=".7"/>
          <line x1="110" y1="292"   x2="155" y2="314.5" stroke="rgba(255,255,255,.08)" strokeWidth=".7"/>
          <line x1="155" y1="266.5" x2="200" y2="244"   stroke="rgba(255,255,255,.05)" strokeWidth=".7"/>
          <line x1="155" y1="314.5" x2="200" y2="292"   stroke="rgba(255,255,255,.05)" strokeWidth=".7"/>
          {/* windows */}
          <rect x="118" y="228" width="7" height="5" rx="1" fill="rgba(255,220,100,.25)"/>
          <rect x="133" y="236" width="7" height="5" rx="1" fill="rgba(255,220,100,.25)"/>
          <rect x="118" y="276" width="7" height="5" rx="1" fill="rgba(255,220,100,.20)"/>
          <rect x="133" y="284" width="7" height="5" rx="1" fill="rgba(255,220,100,.20)"/>
          <rect x="163" y="228" width="7" height="5" rx="1" fill="rgba(255,220,100,.18)"/>
          <rect x="178" y="221" width="7" height="5" rx="1" fill="rgba(255,220,100,.18)"/>
          <rect x="163" y="276" width="7" height="5" rx="1" fill="rgba(255,220,100,.15)"/>
          <rect x="178" y="269" width="7" height="5" rx="1" fill="rgba(255,220,100,.15)"/>
        </g>

        {/* ═══════════════════════════════════════════════
            BLOCK B — Rose  (1,0)  3 floors
            sx=245  sy=317.5  h=144
            Top:   (245,173.5)(290,196)(245,218.5)(200,196)
            Left:  (200,196)(245,218.5)(245,362.5)(200,340)
            Right: (245,218.5)(290,196)(290,340)(245,362.5)
            ═══════════════════════════════════════════════ */}
        <g className="iso-b">
          {/* left face */}
          <polygon points="200,196 245,218.5 245,362.5 200,340" fill="#8B0F4A"/>
          {/* right face */}
          <polygon points="245,218.5 290,196 290,340 245,362.5" fill="#B01260"/>
          {/* top face */}
          <polygon
            points="245,173.5 290,196 245,218.5 200,196"
            fill="#E8197A"
            stroke="rgba(255,100,180,.3)" strokeWidth=".8"
          />
          <polygon points="245,173.5 290,196 245,218.5 200,196" fill="rgba(255,255,255,.06)"/>
          {/* floor dividers */}
          <line x1="200" y1="244"   x2="245" y2="266.5" stroke="rgba(255,255,255,.08)" strokeWidth=".7"/>
          <line x1="200" y1="292"   x2="245" y2="314.5" stroke="rgba(255,255,255,.08)" strokeWidth=".7"/>
          <line x1="245" y1="266.5" x2="290" y2="244"   stroke="rgba(255,255,255,.05)" strokeWidth=".7"/>
          <line x1="245" y1="314.5" x2="290" y2="292"   stroke="rgba(255,255,255,.05)" strokeWidth=".7"/>
          {/* windows */}
          <rect x="208" y="228" width="7" height="5" rx="1" fill="rgba(255,120,180,.3)"/>
          <rect x="224" y="236" width="7" height="5" rx="1" fill="rgba(255,120,180,.3)"/>
          <rect x="208" y="276" width="7" height="5" rx="1" fill="rgba(255,120,180,.22)"/>
          <rect x="224" y="284" width="7" height="5" rx="1" fill="rgba(255,120,180,.22)"/>
          <rect x="252" y="228" width="7" height="5" rx="1" fill="rgba(255,120,180,.20)"/>
          <rect x="267" y="220" width="7" height="5" rx="1" fill="rgba(255,120,180,.20)"/>
          <rect x="252" y="276" width="7" height="5" rx="1" fill="rgba(255,120,180,.15)"/>
          <rect x="267" y="268" width="7" height="5" rx="1" fill="rgba(255,120,180,.15)"/>
        </g>

        {/* ═══════════════════════════════════════════════
            BLOCK A — Cyan  (0,0)  5 floors  ← hero
            sx=200  sy=295  h=240
            Top:   (200,55)(245,77.5)(200,100)(155,77.5)
            Left:  (155,77.5)(200,100)(200,340)(155,317.5)
            Right: (200,100)(245,77.5)(245,317.5)(200,340)
            ═══════════════════════════════════════════════ */}
        <g className="iso-a">
          {/* glow beneath top face */}
          <ellipse cx="200" cy="88" rx="48" ry="14" fill="rgba(0,204,204,.08)" filter="url(#gsoft)"/>
          {/* left face */}
          <polygon points="155,77.5 200,100 200,340 155,317.5" fill="#007A7A"/>
          {/* right face */}
          <polygon points="200,100 245,77.5 245,317.5 200,340" fill="#009999"/>
          {/* top face */}
          <polygon
            points="200,55 245,77.5 200,100 155,77.5"
            fill="#00CCCC"
            stroke="rgba(0,255,255,.4)" strokeWidth="1"
          />
          {/* top face shimmer */}
          <polygon points="200,55 245,77.5 200,100 155,77.5" fill="rgba(255,255,255,.10)"/>
          {/* floor dividers left */}
          <line x1="155" y1="125.5" x2="200" y2="148"   stroke="rgba(0,255,255,.12)" strokeWidth=".8"/>
          <line x1="155" y1="173.5" x2="200" y2="196"   stroke="rgba(0,255,255,.12)" strokeWidth=".8"/>
          <line x1="155" y1="221.5" x2="200" y2="244"   stroke="rgba(0,255,255,.12)" strokeWidth=".8"/>
          <line x1="155" y1="269.5" x2="200" y2="292"   stroke="rgba(0,255,255,.12)" strokeWidth=".8"/>
          {/* floor dividers right */}
          <line x1="200" y1="148"   x2="245" y2="125.5" stroke="rgba(0,255,255,.08)" strokeWidth=".8"/>
          <line x1="200" y1="196"   x2="245" y2="173.5" stroke="rgba(0,255,255,.08)" strokeWidth=".8"/>
          <line x1="200" y1="244"   x2="245" y2="221.5" stroke="rgba(0,255,255,.08)" strokeWidth=".8"/>
          <line x1="200" y1="292"   x2="245" y2="269.5" stroke="rgba(0,255,255,.08)" strokeWidth=".8"/>
          {/* windows left — lit cyan */}
          <rect x="163" y="108" width="8" height="6" rx="1" fill="rgba(0,255,255,.3)"/>
          <rect x="179" y="115" width="8" height="6" rx="1" fill="rgba(0,255,255,.3)"/>
          <rect x="163" y="156" width="8" height="6" rx="1" fill="rgba(0,255,255,.28)"/>
          <rect x="179" y="163" width="8" height="6" rx="1" fill="rgba(0,255,255,.28)"/>
          <rect x="163" y="204" width="8" height="6" rx="1" fill="rgba(0,255,255,.22)"/>
          <rect x="179" y="211" width="8" height="6" rx="1" fill="rgba(0,255,255,.22)"/>
          <rect x="163" y="252" width="8" height="6" rx="1" fill="rgba(0,255,255,.18)"/>
          <rect x="179" y="259" width="8" height="6" rx="1" fill="rgba(0,255,255,.18)"/>
          <rect x="163" y="300" width="8" height="6" rx="1" fill="rgba(0,255,255,.14)"/>
          <rect x="179" y="307" width="8" height="6" rx="1" fill="rgba(0,255,255,.14)"/>
          {/* windows right */}
          <rect x="208" y="108" width="8" height="6" rx="1" fill="rgba(0,255,255,.22)"/>
          <rect x="225" y="100" width="8" height="6" rx="1" fill="rgba(0,255,255,.22)"/>
          <rect x="208" y="156" width="8" height="6" rx="1" fill="rgba(0,255,255,.18)"/>
          <rect x="225" y="148" width="8" height="6" rx="1" fill="rgba(0,255,255,.18)"/>
          <rect x="208" y="204" width="8" height="6" rx="1" fill="rgba(0,255,255,.14)"/>
          <rect x="225" y="196" width="8" height="6" rx="1" fill="rgba(0,255,255,.14)"/>
          <rect x="208" y="252" width="8" height="6" rx="1" fill="rgba(0,255,255,.12)"/>
          <rect x="225" y="244" width="8" height="6" rx="1" fill="rgba(0,255,255,.12)"/>
        </g>

        {/* ── Connection lines (static, behind orbs) ───── */}
        {/* A ↔ D */}
        <line x1="200" y1="55"    x2="200" y2="148"
          stroke="rgba(0,204,204,.25)" strokeWidth="1" className="ld"/>
        {/* A ↔ B */}
        <line x1="200" y1="55"    x2="245" y2="173.5"
          stroke="rgba(232,25,122,.2)" strokeWidth="1" className="ld-b"/>
        {/* A ↔ C */}
        <line x1="200" y1="55"    x2="155" y2="173.5"
          stroke="rgba(245,158,11,.2)" strokeWidth="1" className="ld"/>
        {/* D ↔ B */}
        <line x1="200" y1="148"   x2="245" y2="173.5"
          stroke="rgba(0,204,204,.15)" strokeWidth="1" className="ld-b"/>
        {/* D ↔ C */}
        <line x1="200" y1="148"   x2="155" y2="173.5"
          stroke="rgba(0,204,204,.15)" strokeWidth="1" className="ld"/>

        {/* ── Glow orbs at building tops ───────────────── */}
        {/* Block A — Cyan */}
        <g className="gp" style={{ transformOrigin: '200px 55px' }}>
          <circle cx="200" cy="55" r="6" fill="rgba(0,204,204,.2)" filter="url(#gc)"/>
          <circle cx="200" cy="55" r="3.5" fill="#00FFFF" filter="url(#gc)"/>
        </g>
        {/* Block D — Blue-white */}
        <g className="gp-d" style={{ transformOrigin: '200px 148px' }}>
          <circle cx="200" cy="148" r="5" fill="rgba(100,180,255,.2)" filter="url(#gc)"/>
          <circle cx="200" cy="148" r="3" fill="#80CCFF" filter="url(#gc)"/>
        </g>
        {/* Block B — Rose */}
        <g className="gp-b" style={{ transformOrigin: '245px 173.5px' }}>
          <circle cx="245" cy="173.5" r="5" fill="rgba(232,25,122,.2)" filter="url(#gr)"/>
          <circle cx="245" cy="173.5" r="3" fill="#FF80C0" filter="url(#gr)"/>
        </g>
        {/* Block C — Amber */}
        <g className="gp-c" style={{ transformOrigin: '155px 173.5px' }}>
          <circle cx="155" cy="173.5" r="5" fill="rgba(245,158,11,.2)" filter="url(#ga)"/>
          <circle cx="155" cy="173.5" r="3" fill="#FFD060" filter="url(#ga)"/>
        </g>
      </svg>

      {/* Tagline pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
        {['🏠 Occupancy', '🔧 Maintenance', '💰 Payments', '🎁 Rewards'].map(label => (
          <span key={label} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, color: 'rgba(0,204,204,.7)',
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,204,204,.06)',
            border: '1px solid rgba(0,204,204,.15)',
            letterSpacing: '.04em',
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
