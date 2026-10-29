/**
 * Fundamentals section in the stock card (NSE/BSE stocks only).
 * /api/fundamentals gives the ingredients (EPS, shares, book value, growth, 4 FY of revenue & profit, beta);
 * Mcap, PE, TTM PE and P/B are calculated here from the live price.
 */
function useFundamentals(sym) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!sym || !/\.(NS|BO)$/.test(sym)) { setState({ loading: false, data: null, error: null }); return undefined; }
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetch(`${API}/fundamentals?sym=${encodeURIComponent(sym)}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setState(j.ok ? { loading: false, data: j, error: null } : { loading: false, data: null, error: j.error || 'No data' }); })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: e.message }); });
    return () => { alive = false; };
  }, [sym]);
  return state;
}

/** Result dates from the Python/yfinance function (works even when Yahoo blocks the JS handshake) */
function useResults(sym) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    if (!sym || !/\.(NS|BO)$/.test(sym)) return undefined;
    let alive = true;
    fetch(`${API}/results?sym=${encodeURIComponent(sym)}`)
      .then((r) => r.json())
      .then((j) => { if (alive && j.ok) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [sym]);
  return data;
}

const fmtResultDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Next / last result date + the price move on the result day */
function ResultsBlock({ rs }) {
  if (!rs || (!rs.next && !rs.last)) return null;
  const tile = (k, v, cls = '') => <div className="dr-stat"><div className="dr-k">{k}</div><div className={`dr-v ${cls}`}>{v}</div></div>;
  const mv = rs.lastMove;
  return (
    <>
      <div className="dr-sec">Results</div>
      <div className="dr-grid">
        {tile('Next results', rs.next ? `${rs.nextIsToday ? 'Today' : fmtResultDate(rs.next)}${rs.nextEstimate ? ' (est.)' : ''}` : '—', rs.nextIsToday ? 'dn' : '')}
        {tile('Last results', rs.last ? `${fmtResultDate(rs.last)}${rs.lastAfterHours ? ' · after mkt' : ''}` : '—')}
        {tile(`Result-day move${rs.reactionDay ? ` (${fmtResultDate(rs.reactionDay)})` : ''}`, mv == null || !isFinite(mv) ? '—' : `${mv >= 0 ? '+' : ''}${mv.toFixed(1)}%`, mv == null ? '' : mv >= 0 ? 'up' : 'dn')}
      </div>
      {rs.nextEstimate && <div className="fd-note">"est." = Yahoo's estimate until the company announces its board meeting date</div>}
    </>
  );
}

/** ₹ crore formatting: 1,23,456 Cr  or  14.2L Cr for ≥ 1 lakh crore */
const crore = (v) => {
  if (v == null || !isFinite(v)) return '—';
  const cr = v / 1e7;
  if (Math.abs(cr) >= 1e5) return `₹${(cr / 1e5).toFixed(2)}L Cr`;
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
};
const ratio = (v) => (v == null || !isFinite(v) || v <= 0 ? '—' : `${v.toFixed(1)}×`);
const growthPct = (v) => (v == null || !isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

/** Small bar chart for 4 financial years; negative years drawn in red */
function FyBars({ title, rows, field }) {
  const vals = rows.map((r) => r[field]).filter((v) => v != null);
  if (!vals.length) return null;
  const max = Math.max(...vals.map(Math.abs)) || 1;
  const first = rows.find((r) => r[field] != null), lastRow = [...rows].reverse().find((r) => r[field] != null);
  const n = rows.indexOf(lastRow) - rows.indexOf(first);
  const cagr = first && lastRow && n > 0 && first[field] > 0 && lastRow[field] > 0
    ? (Math.pow(lastRow[field] / first[field], 1 / n) - 1) * 100 : null;
  return (
    <div className="fb-chart">
      <div className="fb-title">{title}</div>
      <div className="fb-bars">
        {rows.map((r) => {
          const v = r[field];
          const h = v == null ? 0 : Math.max(4, (Math.abs(v) / max) * 64);
          return (
            <div className="fb-col" key={r.fy} title={`${r.fy}: ${crore(v)}`}>
              <div className="fb-v">{v == null ? '—' : crore(v).replace('₹', '').replace(' Cr', '')}</div>
              <div className={`fb-bar${v != null && v < 0 ? ' neg' : ''}`} style={{ height: `${h}px` }} />
              <div className="fb-fy">{r.fy}</div>
            </div>
          );
        })}
      </div>
      <div className="fb-cagr">{cagr != null ? `${n}Y CAGR ${growthPct(cagr)}` : '₹ crore'}</div>
    </div>
  );
}

function Fundamentals({ sym, price }) {
  const f = useFundamentals(sym);
  const py = useResults(sym);
  if (!sym || !/\.(NS|BO)$/.test(sym)) return null;
  const resultsSrc = py || f.data?.results || null; // Python first, JS as backup
  if (f.loading) return <><ResultsBlock rs={resultsSrc} /><div className="dr-sec">Fundamentals <span className="fd-muted">loading…</span></div></>;
  if (f.error || !f.data) return <><ResultsBlock rs={resultsSrc} /><div className="dr-sec">Fundamentals <span className="fd-muted">unavailable{f.error ? ` — ${f.error}` : ''}</span></div></>;

  const d = f.data;
  const mcap = d.shares && price ? d.shares * price : null;
  const pe = d.eps.fy ? price / d.eps.fy : null;
  const ttmPe = d.eps.ttm ? price / d.eps.ttm : null;
  const pb = d.bookValuePerShare ? price / d.bookValuePerShare : null;
  const g = d.growth;
  const tile = (k, v, cls = '') => <div className="dr-stat"><div className="dr-k">{k}</div><div className={`dr-v ${cls}`}>{v}</div></div>;
  const gcls = (v) => (v == null ? '' : v >= 0 ? 'up' : 'dn');

  return (
    <>
      <ResultsBlock rs={resultsSrc} />
      <div className="dr-sec">Fundamentals</div>
      <div className="dr-grid fd-grid">
        {tile('Market cap', crore(mcap))}
        {tile('Beta (1Y vs Nifty)', d.beta != null ? d.beta.toFixed(2) : '—')}
        {tile(`PE${d.eps.fyLabel ? ` (${d.eps.fyLabel})` : ''}`, ratio(pe))}
        {tile('TTM PE', ratio(ttmPe))}
        {tile('P/B', ratio(pb))}
        {tile(`Revenue YoY`, growthPct(g.revenue), gcls(g.revenue))}
        {tile(`PAT YoY`, growthPct(g.pat), gcls(g.pat))}
        {tile(`${g.opLabel} YoY`, growthPct(g.op), gcls(g.op))}
      </div>
      {d.quarter && <div className="fd-note">Growth: {d.quarter} vs same quarter last year</div>}
      {d.annual?.length > 0 && (
        <div className="fb-wrap">
          <FyBars title={d.bankLike ? 'Total income' : 'Revenue'} rows={d.annual} field="revenue" />
          <FyBars title="Net profit" rows={d.annual} field="netIncome" />
        </div>
      )}
      <div className="fd-note">Source: Yahoo Finance · ratios use live price · refreshed daily</div>
    </>
  );
}
