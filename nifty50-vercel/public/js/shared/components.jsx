// ── Small components shared by the Dashboard and Impact pages ──

/** "NSE LIVE" / "MARKET CLOSED" pill */
function MarketPill({ live }) {
  return (
    <div className="pill">
      <div className={`dot${live ? '' : ' off'}`} />
      <span>{live ? 'NSE LIVE' : 'MARKET CLOSED'}</span>
    </div>
  );
}

function RefreshButton({ spinning, onClick }) {
  return (
    <button className={`btn${spinning ? ' spinning' : ''}`} onClick={onClick}>
      <span className="spin-i">↺</span> REFRESH
    </button>
  );
}

/** Section label with the thin divider line */
function SectionHead({ label, children }) {
  return (
    <div className="sh">
      <div className="sl">{label}</div>
      <div className="sline" />
      {children}
    </div>
  );
}

/** Faint "SAHIL PARAB" watermark fixed at the bottom of the screen */
function Watermark() {
  return (
    <div style={{
      position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: 50, opacity: 0.045, fontFamily: 'var(--ui)',
      fontSize: 52, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap',
      letterSpacing: '-.5px', userSelect: 'none',
    }}>
      SAHIL PARAB
    </div>
  );
}

/** "Not investment advice · Built by Sahil Parab" */
function CreditLine() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--dim)' }}>Not investment advice</span>
      <span style={{ color: 'var(--bd2)' }}>·</span>
      <span style={{ fontFamily: 'var(--ui)', fontWeight: 700, color: 'var(--muted)' }}>
        Built by <span style={{ color: 'var(--up)' }}>Sahil Parab</span>
      </span>
    </span>
  );
}
