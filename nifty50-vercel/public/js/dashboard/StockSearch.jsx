/**
 * Search box: matches Nifty 50 stocks by name or symbol. Any other NSE symbol can be
 * opened too ("Open XYZ on NSE"). Enter picks the first result; Esc clears.
 */
function StockSearch({ stocks, onSelect }) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const term = q.trim().toLowerCase();

  const matches = term
    ? stocks.filter((s) => s.name.toLowerCase().includes(term) || ticker(s.sym).toLowerCase().includes(term)).slice(0, 8)
    : [];
  const raw = q.trim().toUpperCase().replace(/\.NS$/, '');
  const exact = stocks.some((s) => ticker(s.sym) === raw);
  const results = [...matches.map((s) => ({ sym: s.sym, label: s.name, sub: ticker(s.sym), stock: s }))];
  if (raw && /^[A-Z0-9&\-]{2,20}$/.test(raw) && !exact) results.push({ sym: `${raw}.NS`, label: `Open ${raw} on NSE`, sub: 'any NSE stock', stock: null });

  const pick = (r) => { onSelect(r.sym); setQ(''); };

  return (
    <div className="srch">
      <input
        className="srch-in"
        placeholder="🔍  Search a stock — name or symbol (e.g. Infosys, TCS, ZOMATO)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) pick(results[0]);
          if (e.key === 'Escape') setQ('');
        }}
      />
      {focus && results.length > 0 && (
        <div className="srch-list">
          {results.map((r) => {
            const up = r.stock ? r.stock.chgPct >= 0 : true;
            return (
              <div key={r.sym} className="srch-it" onMouseDown={() => pick(r)}>
                <div><div className="srch-n">{r.label}</div><div className="srch-s">{r.sub}</div></div>
                {r.stock && (
                  <div className="srch-r">
                    <span>₹{fp(r.stock.price)}</span>
                    <span className={up ? 'up' : 'dn'}>{up ? '+' : ''}{r.stock.chgPct.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
