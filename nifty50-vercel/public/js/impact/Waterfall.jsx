/** Per-stock point impact bars, sorted by absolute impact */
function Waterfall({ rows, onSelect }) {
  const sorted = [...rows].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
  const maxAbs = Math.max(...sorted.map((r) => Math.abs(r.pts)));

  return (
    <div className="wf-wrap">
      <div className="wf-inner">
        {sorted.map((r) => {
          const h = Math.max(4, (Math.abs(r.pts) / maxAbs) * 150);
          const col = r.pts >= 0
            ? (r.pts > maxAbs * 0.5 ? '#16a34a' : r.pts > maxAbs * 0.2 ? '#22c55e' : '#4ade80')
            : (r.pts < -maxAbs * 0.5 ? '#b91c1c' : r.pts < -maxAbs * 0.2 ? '#ef4444' : '#f87171');
          return (
            <div className="wf-col clickable" key={r.sym} onClick={() => onSelect(r.sym)}>
              <div className="wf-pts" style={{ color: col }}>{signed(r.pts)}</div>
              <div className="wf-bar" style={{ height: `${h}px`, background: col }} title={`${r.name}: ${signed(r.pts)} pts`} />
              <div className="wf-name">{r.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
