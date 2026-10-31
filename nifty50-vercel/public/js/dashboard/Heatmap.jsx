const HEATMAP_LEGEND = [
  ['#7f1d1d', '<−3%'], ['#b91c1c', '−2%'], ['#dc2626', '−1%'], ['#263850', '0'],
  ['#15803d', '+1%'], ['#16a34a', '+2%'], ['#22c55e', '>+3%'],
];

/** Cell colour by % change */
function hcol(p) {
  if (p >= 3) return '#16a34a';
  if (p >= 2) return '#15803d';
  if (p >= 1) return '#166534';
  if (p >= 0.3) return '#14532d';
  if (p >= -0.3) return '#263850';
  if (p >= -1) return '#7f1d1d';
  if (p >= -2) return '#991b1b';
  if (p >= -3) return '#b91c1c';
  return '#dc2626';
}

/**
 * Weight-sized heatmap on a 20-column grid.
 * Column span ∝ index weight (14.5% → 6 cols, smallest → 1); bigger cells also span more rows.
 */
function Heatmap({ stocks, onTip, flash, onSelect }) {
  const sorted = [...stocks].sort((a, b) => (WEIGHTS[b.sym] || 1) - (WEIGHTS[a.sym] || 1));

  return (
    <div className="hm-wrap">
      <div className="hm-leg">
        <span className="lbl">CHANGE %</span>
        {HEATMAP_LEGEND.map(([c, l]) => (
          <span key={l}><span className="sw" style={{ background: c }} />{l}</span>
        ))}
      </div>
      <div id="heatmap">
        {sorted.map((s) => {
          const pct = s.chgPct || 0;
          const up = pct >= 0;
          const weight = WEIGHTS[s.sym] || 1.0;
          const colSpan = Math.min(6, Math.max(1, Math.round((weight / 14.5) * 6)));
          const rowSpan = colSpan >= 5 ? 3 : colSpan >= 4 ? 2 : colSpan >= 2 ? 2 : 1;
          const nameSize = colSpan >= 4 ? '13px' : colSpan >= 2 ? '11px' : '9px';
          const chgSize = colSpan >= 4 ? '15px' : colSpan >= 2 ? '12px' : '10px';
          const track = (e) => onTip({ stock: s, x: e.clientX, y: e.clientY });
          return (
            <div
              key={s.sym}
              className={`hc${flash[s.sym] ? ` flash-${flash[s.sym]}` : ''}`}
              style={{
                background: hcol(pct),
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                minHeight: `${rowSpan * 54}px`,
              }}
              onMouseEnter={track}
              onMouseMove={track}
              onMouseLeave={() => onTip(null)}
              onClick={() => { onTip(null); onSelect(s.sym); }}
            >
              <div className="hc-n" style={{ fontSize: nameSize }}>{s.name}</div>
              <div>
                <div className="hc-c" style={{ fontSize: chgSize }}>{up ? '+' : ''}{pct.toFixed(2)}%</div>
                <div className="hc-p">₹{fp(s.price)} · {weight}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
