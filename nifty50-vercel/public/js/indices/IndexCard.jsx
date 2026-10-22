/** Tiny intraday line drawn from the 5-minute closes */
function Sparkline({ points, up }) {
  if (!points || points.length < 2) return <div className="ix-spark" />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((v, i) => `${(i / (points.length - 1)) * 100},${30 - ((v - min) / span) * 28 - 1}`).join(' ');
  return (
    <svg className="ix-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke={up ? 'var(--up)' : 'var(--dn)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function IndexCard({ ix, onOpen }) {
  if (!ix.ok) {
    return (
      <div className="ix-card na">
        <div className="ix-name">{ix.name}</div>
        <div className="ix-val">—</div>
        <div className="ix-chg">n/a on Yahoo</div>
      </div>
    );
  }
  const up = (ix.chgPct ?? 0) >= 0;
  const isVix = ix.id === 'vix';
  return (
    <div className={`ix-card ${up ? 'up' : 'dn'}${isVix ? ' vix' : ''}`} onClick={() => onOpen(ix.id)}>
      <div className="ix-top">
        <div className="ix-name">{ix.name}</div>
        {ix.movers && <span className="ix-tag" title="Tap for gainers & losers">▲▼</span>}
      </div>
      <div className="ix-val">{fp(ix.price)}</div>
      <div className={`ix-chg ${up ? 'up' : 'dn'}`}>
        {ix.chgPct != null ? `${up ? '+' : ''}${fp(ix.chg)} (${up ? '+' : ''}${ix.chgPct.toFixed(2)}%)` : '—'}
      </div>
      <Sparkline points={ix.spark} up={up} />
    </div>
  );
}
