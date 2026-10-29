const IMPACT_FILTERS = { up: (r) => r.pts > 0, dn: (r) => r.pts < 0 };
const IMPACT_COLUMNS = [
  ['name', 'Stock'], ['weight', 'Weight'], ['chgPct', 'Chg %'], ['pts', 'Impact (pts)'],
  ['pts15', '15m pts'], [null, 'Impact Bar'], ['price', 'Price'], ['chg', 'Chg ₹'], [null, 'Sector'],
];
const IMPACT_FILTER_BUTTONS = [['all', 'All'], ['up', 'Adding Points'], ['dn', 'Dragging Down']];

function ImpactTable({ rows, niftyLevel, onSelect, window15, nifty15 }) {
  const { filt, setFilt, filtered, sortBy, thClass } = useSortableTable(rows, 'pts', IMPACT_FILTERS);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pts)));

  return (
    <div className="tw">
      <div className="fb">
        {IMPACT_FILTER_BUTTONS.map(([key, label]) => (
          <button key={key} className={`fb-btn${filt === key ? ' on' : ''}`} onClick={() => setFilt(key)}>{label}</button>
        ))}
        <div className="fb-sp" />
        {window15 && (
          <span className="fc w15" title="Latest 15-minute candle (Yahoo data is ~15 min delayed)">
            15m window {window15.from}–{window15.to}
            {' · '}model {signed(rows.reduce((s, r) => s + (r.pts15 || 0), 0))} pts
            {nifty15 != null && <> · Nifty {signed(nifty15)} pts</>}
          </span>
        )}
        <span className="fc">{rows.length ? `${filtered.length} stocks` : ''}</span>
      </div>
      <table>
        <thead>
          <tr>
            {IMPACT_COLUMNS.map(([col, label]) => (
              <th key={label} className={col ? thClass(col) : ''} onClick={col ? () => sortBy(col) : undefined}
                title={col === 'pts15' && window15 ? `Nifty points from each stock's move in ${window15.from}–${window15.to}` : undefined}>{label}</th>
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
                  <div className="tn">{r.name}<EventBadges list={r.badges} /></div>
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
                <td title={r.move15 != null ? `${signed(r.move15, 2)}% in ${r.window15?.from}–${r.window15?.to}` : 'waiting for 15-minute data'}>
                  {r.pts15 == null ? <span className="ipts neu">…</span>
                    : <span className={`ipts ${r.pts15 >= 0 ? 'up' : 'dn'}`}>{signed(r.pts15)}</span>}
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
