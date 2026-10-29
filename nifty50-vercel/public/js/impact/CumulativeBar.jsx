/** Sector contributions as one stacked bar, width ∝ absolute points */
function CumulativeBar({ rows }) {
  const secMap = {};
  rows.forEach((r) => { secMap[r.sector] = (secMap[r.sector] || 0) + r.pts; });

  const total = rows.reduce((s, r) => s + r.pts, 0);
  const totalAbs = rows.reduce((s, r) => s + Math.abs(r.pts), 0);
  const entries = Object.entries(secMap).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const up = total >= 0;

  return (
    <div className="cum-wrap">
      <div className="cum-label">
        <span>Point contribution by sector — width proportional to absolute impact</span>
        <span style={{ fontFamily: 'var(--ui)', fontWeight: 800, fontSize: 14, color: up ? 'var(--up)' : 'var(--dn)' }}>
          {signed(total)} pts
        </span>
      </div>
      <div className="cum-track">
        {entries.map(([sec, pts]) => {
          const base = SECTOR_COLORS[sec] || '#3b82f6';
          return (
            <div
              key={sec}
              className="cum-seg"
              style={{
                width: `${((Math.abs(pts) / totalAbs) * 100).toFixed(2)}%`,
                background: pts >= 0 ? base : darken(base),
                filter: pts < 0 ? 'brightness(.6)' : undefined,
              }}
              title={`${sec}: ${signed(pts)} pts`}
            />
          );
        })}
      </div>
      <div className="cum-legend">
        {entries.map(([sec, pts]) => (
          <div className="cum-li" key={sec}>
            <div className="cum-dot" style={{ background: SECTOR_COLORS[sec] || '#94a3b8' }} />
            <span>{sec}: <strong style={{ color: pts >= 0 ? 'var(--up)' : 'var(--dn)' }}>{signed(pts)}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}
