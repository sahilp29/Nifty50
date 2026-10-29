/**
 * What-if simulator: "if HDFC Bank moves +2%, how many Nifty points is that?"
 * Uses the same model as /api/nifty: pts = base × (weight / total weight) × change%.
 * Pick a stock or a whole sector, drag the slider.
 */
function WhatIf({ rows, niftyLevel, impactBase }) {
  const [target, setTarget] = useState(() => {
    const top = [...rows].sort((a, b) => b.weight - a.weight)[0];
    return top ? `stock:${top.sym}` : '';
  });
  const [pct, setPct] = useState(2);

  const totalW = rows.reduce((s, r) => s + r.weight, 0) || 1;
  const factor = (r) => (impactBase * (r.weight / totalW)) / 100; // points per 1% move
  const sectors = [...new Set(rows.map((r) => r.sector))].sort();

  const [kind, key] = target.split(':');
  const group = kind === 'sector' ? rows.filter((r) => r.sector === key) : rows.filter((r) => r.sym === key);
  const label = kind === 'sector' ? `${key} sector` : group[0]?.name || '—';
  const simPts = group.reduce((s, r) => s + factor(r) * pct, 0);
  const actualPts = group.reduce((s, r) => s + r.pts, 0);
  const actualPct = group.length === 1 ? group[0].chgPct : null;
  const wt = group.reduce((s, r) => s + r.weight, 0);
  const estLevel = niftyLevel - actualPts + simPts;
  const up = simPts >= 0;

  return (
    <div className="wi-wrap">
      <div className="wi-controls">
        <select className="wi-sel" value={target} onChange={(e) => setTarget(e.target.value)}>
          <optgroup label="Stocks">
            {[...rows].sort((a, b) => b.weight - a.weight).map((r) => (
              <option key={r.sym} value={`stock:${r.sym}`}>{r.name} ({r.weight.toFixed(2)}%)</option>
            ))}
          </optgroup>
          <optgroup label="Whole sector">
            {sectors.map((s) => <option key={s} value={`sector:${s}`}>{s}</option>)}
          </optgroup>
        </select>
        <div className="wi-quick">
          {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
            <button key={v} className={`fb-btn${pct === v ? ' on' : ''}`} onClick={() => setPct(v)}>{v > 0 ? '+' : ''}{v}%</button>
          ))}
        </div>
      </div>

      <input className="wi-range" type="range" min="-10" max="10" step="0.25" value={pct} onChange={(e) => setPct(+e.target.value)} />

      <div className="wi-out">
        <div>
          <div className="hs-lbl">If {label} moves</div>
          <div className={`hs-val ${pct >= 0 ? 'up' : 'dn'}`}>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</div>
          <div className="hs-sub">{wt.toFixed(2)}% of index weight</div>
        </div>
        <div>
          <div className="hs-lbl">Nifty impact</div>
          <div className={`hs-val ${up ? 'up' : 'dn'}`}>{signed(simPts)} pts</div>
          <div className="hs-sub">≈ {signed((simPts / impactBase) * 100, 2)}% of the index</div>
        </div>
        <div>
          <div className="hs-lbl">Actual today</div>
          <div className={`hs-val ${actualPts >= 0 ? 'up' : 'dn'}`}>{signed(actualPts)} pts</div>
          <div className="hs-sub">{actualPct != null ? `${signed(actualPct, 2)}% move` : 'combined sector move'}</div>
        </div>
        <div>
          <div className="hs-lbl">Nifty would be at</div>
          <div className="hs-val neu">{estLevel.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
          <div className="hs-sub">swapping today's move for this one</div>
        </div>
      </div>
    </div>
  );
}
