const CHART_TABS = [['15m', '15m · 5D'], ['1d', '1D · 6M']];

/** ₹ for Indian stocks, $ for US-listed/commodities, otherwise the currency code */
const money = (n, cur = 'INR') =>
  cur === 'INR' ? `₹${fp(n)}`
    : cur === 'USD' ? `$${n == null || isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
    : `${cur} ${fp(n)}`;

/** Loads candles (and a quote, for stocks outside the Nifty 50) for the open stock */
function useCandles(sym, interval) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!sym) return undefined;
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetch(`${API}/candles?sym=${encodeURIComponent(sym)}&interval=${interval}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setState(j.ok ? { loading: false, data: j, error: null } : { loading: false, data: null, error: j.error || 'No data' }); })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: e.message }); });
    return () => { alive = false; };
  }, [sym, interval]);
  return state;
}

/**
 * Slide-in panel for one stock: price, candle chart (15m / 1D), day range and stats.
 * Opens from any stock or global cue on the Dashboard and Impact pages; closes with ✕, the backdrop, or Esc.
 * Nifty 50 stocks use the live dashboard data; other NSE stocks use the chart's quote.
 */
function StockDrawer({ sym, stocks, impact, onClose, showImpactLink = true, onBack = null, backLabel = '' }) {
  const [interval, setIntervalTab] = useState('15m');
  const chart = useCandles(sym, interval);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = !!sym;
  const nifty = sym ? stocks.find((x) => x.sym === sym) : null;
  const q = chart.data?.quote;

  // Unified view of the stock, whichever source it comes from
  let s = null;
  if (nifty) s = nifty;
  else if (q && q.price != null) {
    const chg = q.prev != null ? q.price - q.prev : null;
    s = { sym, cur: q.currency || 'INR', name: q.name, price: q.price, prev: q.prev, chg, chgPct: chg != null ? (chg / q.prev) * 100 : null, high: q.high, low: q.low, vol: q.vol };
  }

  let body = null;
  if (sym) {
    const up = s?.chgPct == null || s.chgPct >= 0;
    const range = s && s.high != null && s.low != null ? s.high - s.low : 0;
    const pos = range > 0 ? Math.min(100, Math.max(0, ((s.price - s.low) / range) * 100)) : 50;
    const rank = nifty ? [...stocks].sort((a, b) => b.chgPct - a.chgPct).findIndex((x) => x.sym === sym) + 1 : null;
    const weight = WEIGHTS[sym];
    const imp = impact[sym];
    const cur = s?.cur || 'INR';
    const m = (n) => money(n, cur);
    const sub = imp ? ` · ${imp.sector}` : nifty ? '' : cur !== 'INR' ? ` · global · ${cur}` : ' · NSE · not in Nifty 50';
    const stat = (k, v) => (<div className="dr-stat"><div className="dr-k">{k}</div><div className="dr-v">{v}</div></div>);

    body = (
      <>
        {onBack && <button className="dr-back" onClick={onBack}>← {backLabel || 'Back'}</button>}
        <div className="dr-hd">
          <div>
            <div className="dr-name">{s?.name || ticker(sym)}</div>
            <div className="dr-sym">{ticker(sym)}{sub}</div>
          </div>
          <button className="dr-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {s && (
          <>
            <div className="dr-price">{m(s.price)}</div>
            {s.chgPct != null && (
              <div className={`dr-chg ${up ? 'up' : 'dn'}`}>
                {up ? '+' : '-'}{m(Math.abs(s.chg))} ({up ? '+' : ''}{s.chgPct.toFixed(2)}%)
              </div>
            )}
          </>
        )}

        <div className="dr-tabs">
          {CHART_TABS.map(([k, label]) => (
            <button key={k} className={`fb-btn${interval === k ? ' on' : ''}`} onClick={() => setIntervalTab(k)}>{label}</button>
          ))}
        </div>
        <div className="dr-chart-wrap">
          {chart.loading && <div className="dr-chart-msg">Loading chart…</div>}
          {chart.error && <div className="dr-chart-msg err">Chart unavailable: {chart.error}</div>}
          {chart.data && <StockChart candles={chart.data.candles} interval={interval} />}
        </div>

        {s && s.high != null && s.low != null && (
          <>
            <div className="dr-sec">Day range</div>
            <div className="dr-range">
              <span>{m(s.low)}</span>
              <div className="dr-track"><div className={`dr-mark ${up ? 'up' : 'dn'}`} style={{ left: `${pos}%` }} /></div>
              <span>{m(s.high)}</span>
            </div>
          </>
        )}

        {s && (
          <div className="dr-grid">
            {stat('Prev close', s.prev != null ? m(s.prev) : '—')}
            {stat('Volume', fv(s.vol))}
            {stat('Day high', m(s.high))}
            {stat('Day low', m(s.low))}
            {nifty && stat('Index weight', weight != null ? `${weight}%` : '—')}
            {nifty && stat('Rank today', `#${rank} of ${stocks.length}`)}
          </div>
        )}

        {imp && (
          <div className="dr-impact">
            <div className="dr-k">Impact on Nifty today</div>
            <div className={`dr-big ${imp.pts >= 0 ? 'up' : 'dn'}`}>{imp.pts >= 0 ? '+' : ''}{imp.pts.toFixed(1)} pts</div>
            <div className="dr-k">Weight × change, same model as the Impact Calculator</div>
          </div>
        )}

        <div className="dr-links">
          {nifty && showImpactLink && <a className="btn" href="/impact.html" style={{ textDecoration: 'none' }}>⚡ Impact Calc</a>}
          <a className="btn" href={`https://finance.yahoo.com/quote/${encodeURIComponent(sym)}`} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>Yahoo Finance ↗</a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`dr-ov${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>{body}</aside>
    </>
  );
}
