const IMPACT_FILTERS = { up: (r) => r.pts > 0, dn: (r) => r.pts < 0 };
const IMPACT_COLUMNS = [
  ['name', 'Stock'], ['weight', 'Weight'], ['chgPct', 'Chg %'], ['pts', 'Impact (pts)'],
  [null, 'Impact Bar'], ['price', 'Price'], ['chg', 'Chg ₹'], [null, 'Sector'],
];
const IMPACT_FILTER_BUTTONS = [['all', 'All'], ['up', 'Adding Points'], ['dn', 'Dragging Down']];

function ImpactTable({ rows, niftyLevel, onSelect }) {
  const { filt, setFilt, filtered, sortBy, thClass } = useSortableTable(rows, 'pts', IMPACT_FILTERS);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pts)));

  return (
    <div className="tw">
      <div className="fb">
        {IMPACT_FILTER_BUTTONS.map(([key, label]) => (
          <button key={key} className={`fb-btn${filt === key ? ' on' : ''}`} onClick={() => setFilt(key)}>{label}</button>
        ))}
        <div className="fb-sp" />
        <span className="fc">{rows.length ? `${filtered.length} stocks` : ''}</span>
      </div>
      <table>
        <thead>
          <tr>
            {IMPACT_COLUMNS.map(([col, label]) => (
              <th key={label} className={col ? thClass(col) : ''} onClick={col ? () => sortBy(col) : undefined}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const up = r.pts >= 0;
            const bw = Math.min(80, (Math.abs(r.pts) / maxAbs) * 80);
            const col = SECTOR_COLORS[r.sector] || '#94a3b8';
            return (
              <tr key={r.sym} className="clickable" onClick={() => onSelect(r.sym)}>
                <td style={{ textAlign: 'left' }}>
                  <div className="tn">{r.name}</div>
                  <div className="ts">{ticker(r.sym)}</div>
                </td>
                <td><span className="tw-w">{r.weight.toFixed(1)}%</span></td>
                <td><span style={{ color: up ? 'var(--up)' : 'var(--dn)', fontFamily: 'var(--ui)', fontWeight: 700 }}>{signed(r.chgPct, 2)}%</span></td>
                <td>
                  <div className="ibar-wrap">
                    <div className={`ibar ${up ? 'up' : 'dn'}`} style={{ width: `${bw}px` }} />
                    <span className={`ipts ${up ? 'up' : 'dn'}`}>{signed(r.pts)}</span>
                  </div>
                </td>
                <td style={{ fontSize: 10, color: 'var(--dim)' }}>{((r.pts / niftyLevel) * 100).toFixed(3)}% of index</td>
                <td>₹{fp(r.price)}</td>
                <td style={{ color: up ? 'var(--up)' : 'var(--dn)' }}>{up ? '+' : '-'}₹{fp(Math.abs(r.chg))}</td>
                <td><span style={{ fontSize: 10, color: col, fontFamily: 'var(--ui)', fontWeight: 700 }}>{r.sector}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
