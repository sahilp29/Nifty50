/** The four summary tiles: total move, gainers, losers, biggest single impact */
function HeroStats({ rows, niftyLevel }) {
  const total = rows.reduce((s, r) => s + r.pts, 0);
  const gainers = rows.filter((r) => r.pts > 0);
  const losers = rows.filter((r) => r.pts < 0);
  const gainPts = gainers.reduce((s, r) => s + r.pts, 0);
  const lossPts = losers.reduce((s, r) => s + r.pts, 0);
  const bigAbs = [...rows].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts))[0];
  const pct = (total / niftyLevel) * 100;
  const up = total >= 0;

  return (
    <div className="hero-strip">
      <div className="hstat big">
        <div className="hs-lbl">Est. Nifty Move (pts)</div>
        <div className={`hs-val ${up ? 'up' : 'dn'}`}>{signed(total)} pts</div>
        <div className="hs-sub">≈ {signed(pct, 2)}% · Live Nifty {niftyLevel.toLocaleString('en-IN')}</div>
      </div>
      <div className="hstat">
        <div className="hs-lbl">Gainers Contributing</div>
        <div className="hs-val up">+{gainPts.toFixed(1)} pts</div>
        <div className="hs-sub">{gainers.length} stocks adding points</div>
      </div>
      <div className="hstat">
        <div className="hs-lbl">Losers Dragging</div>
        <div className="hs-val dn">{lossPts.toFixed(1)} pts</div>
        <div className="hs-sub">{losers.length} stocks pulling down</div>
      </div>
      <div className="hstat">
        <div className="hs-lbl">Biggest Single Impact</div>
        <div className={bigAbs ? `hs-val ${bigAbs.pts >= 0 ? 'up' : 'dn'}` : 'hs-val'}>{bigAbs ? `${signed(bigAbs.pts)} pts` : '—'}</div>
        <div className="hs-sub">{bigAbs ? bigAbs.name : '—'}</div>
      </div>
    </div>
  );
}
