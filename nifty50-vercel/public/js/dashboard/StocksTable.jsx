const STOCK_FILTERS = { up: (s) => s.chgPct >= 0, dn: (s) => s.chgPct < 0 };
const STOCK_COLUMNS = [
  ['name', '#  Company'], ['price', 'Price'], ['chgPct', 'Chg %'], ['chg', 'Chg ₹'],
  [null, 'Bar'], ['high', 'High'], ['low', 'Low'], ['vol', 'Volume'],
];
const STOCK_FILTER_BUTTONS = [['all', 'All (50)'], ['up', 'Gainers'], ['dn', 'Losers']];

function StocksTable({ stocks, flash, onSelect }) {
  const { filt, setFilt, filtered, sortBy, thClass } = useSortableTable(stocks, 'chgPct', STOCK_FILTERS);

  return (
    <div className="tw">
      <div className="fb">
        {STOCK_FILTER_BUTTONS.map(([key, label]) => (
          <button key={key} className={`fb-btn${filt === key ? ' on' : ''}`} onClick={() => setFilt(key)}>{label}</button>
        ))}
        <div className="fb-sp" />
        <span className="fc">{stocks.length ? `${filtered.length} stocks` : ''}</span>
      </div>
      <table>
        <thead>
          <tr>
            {STOCK_COLUMNS.map(([col, label]) => (
              <th key={label} className={col ? thClass(col) : ''} onClick={col ? () => sortBy(col) : undefined}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((s, i) => {
            const up = s.chgPct >= 0;
            const bw = Math.min(50, Math.abs(s.chgPct) * 12);
            return (
              <tr key={s.sym} className={flash[s.sym] ? `flash-${flash[s.sym]}` : ''} onClick={() => onSelect(s.sym)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ color: 'var(--dim)', fontSize: 11, minWidth: 18 }}>{i + 1}</span>
                    <div><div className="tn">{s.name}</div><div className="ts">{ticker(s.sym)}</div></div>
                  </div>
                </td>
                <td style={{ fontWeight: 500 }}>₹{fp(s.price)}</td>
                <td><span className={`tc ${up ? 'up' : 'dn'}`}>{up ? '+' : ''}{s.chgPct.toFixed(2)}%</span></td>
                <td style={{ color: up ? 'var(--up)' : 'var(--dn)' }}>{up ? '+' : '-'}₹{fp(Math.abs(s.chg))}</td>
                <td className="bar-c">
                  <div className="bw"><div className="bm" /><div className={`bf ${up ? 'up' : 'dn'}`} style={{ width: `${bw}%` }} /></div>
                </td>
                <td>₹{fp(s.high)}</td>
                <td>₹{fp(s.low)}</td>
                <td style={{ color: 'var(--muted)' }}>{fv(s.vol)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
