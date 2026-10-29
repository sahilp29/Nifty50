function MoverRows({ list, onSelectStock }) {
  if (!list.length) return <div className="mv-empty">None</div>;
  return list.map((q) => {
    const up = q.chgPct >= 0;
    return (
      <div className="mv-row" key={q.sym} onClick={() => onSelectStock(q.sym)}>
        <div className="mv-n"><div>{q.name}</div><div className="mv-s">{ticker(q.sym)}</div></div>
        <div className="mv-p">₹{fp(q.price)}</div>
        <div className={`mv-c ${up ? 'up' : 'dn'}`}>{up ? '+' : ''}{q.chgPct.toFixed(2)}%</div>
      </div>
    );
  });
}

/**
 * Index card: value, candle chart (15m / 1D), day range, and — for indices with a
 * constituent list — top gainers & losers. Tapping a stock opens its stock card.
 */
function IndexDrawer({ ix, onClose, onSelectStock }) {
  const [interval, setIntervalTab] = useState('15m');
  const chart = useCandles(ix?.ok ? ix.symbol : null, interval);
  const movers = useIndexMovers(ix?.id, !!ix?.movers);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = !!ix;
  let body = null;
  if (ix) {
    const up = (ix.chgPct ?? 0) >= 0;
    const range = ix.high != null && ix.low != null ? ix.high - ix.low : 0;
    const pos = range > 0 ? Math.min(100, Math.max(0, ((ix.price - ix.low) / range) * 100)) : 50;
    const m = movers.data;

    body = (
      <>
        <div className="dr-hd">
          <div>
            <div className="dr-name">{ix.name}</div>
            <div className="dr-sym">{ix.group}{ix.id === 'vix' ? ' · higher = more fear' : ''}</div>
          </div>
          <button className="dr-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {ix.ok && (
          <>
            <div className="dr-price">{fp(ix.price)}</div>
            {ix.chgPct != null && (
              <div className={`dr-chg ${up ? 'up' : 'dn'}`}>{up ? '+' : ''}{fp(ix.chg)} ({up ? '+' : ''}{ix.chgPct.toFixed(2)}%)</div>
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

        {ix.ok && ix.high != null && ix.low != null && (
          <>
            <div className="dr-sec">Day range</div>
            <div className="dr-range">
              <span>{fp(ix.low)}</span>
              <div className="dr-track"><div className={`dr-mark ${up ? 'up' : 'dn'}`} style={{ left: `${pos}%` }} /></div>
              <span>{fp(ix.high)}</span>
            </div>
            <div className="dr-grid">
              <div className="dr-stat"><div className="dr-k">Prev close</div><div className="dr-v">{fp(ix.prev)}</div></div>
              <div className="dr-stat"><div className="dr-k">Day high / low</div><div className="dr-v">{fp(ix.high)} / {fp(ix.low)}</div></div>
            </div>
          </>
        )}

        {ix.movers && (
          <div className="mv-wrap">
            {movers.loading && <div className="dr-chart-msg static">Loading gainers & losers…</div>}
            {movers.error && <div className="dr-chart-msg static err">Gainers/losers unavailable: {movers.error}</div>}
            {m && (
              <>
                <div className="mv-breadth">
                  <span className="up">▲ {m.advances} advancing</span>
                  <span className="dn">▼ {m.declines} declining</span>
                  <span>{m.fetched}/{m.total} stocks</span>
                </div>
                <div className="mv-bar">
                  <div className="up" style={{ width: `${(m.advances / (m.fetched || 1)) * 100}%` }} />
                  <div className="dn" style={{ width: `${(m.declines / (m.fetched || 1)) * 100}%` }} />
                </div>
                <div className="dr-sec">Top {m.n} gainers</div>
                <MoverRows list={m.gainers} onSelectStock={onSelectStock} />
                <div className="dr-sec">Top {m.n} losers</div>
                <MoverRows list={m.losers} onSelectStock={onSelectStock} />
              </>
            )}
          </div>
        )}
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
