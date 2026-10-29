/** Nifty level + change. Falls back to the average % change if ^NSEI failed. */
function IndexStat({ stocks, niftyIndex }) {
  let val = '—', chg = 'loading…', cls = 'i-chg';
  if (niftyIndex && niftyIndex.price) {
    const up = niftyIndex.chgPct >= 0;
    val = niftyIndex.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    chg = `${up ? '+' : ''}${niftyIndex.chg.toFixed(2)} (${up ? '+' : ''}${niftyIndex.chgPct.toFixed(2)}%)`;
    cls = `i-chg ${up ? 'up' : 'dn'}`;
  } else if (stocks.length) {
    const avg = stocks.reduce((a, s) => a + s.chgPct, 0) / stocks.length;
    const up = avg >= 0;
    val = 'Nifty 50';
    chg = `${up ? '+' : ''}${avg.toFixed(2)}% avg`;
    cls = `i-chg ${up ? 'up' : 'dn'}`;
  }
  return (
    <div className="index-stat">
      <div className="i-val">{val}</div>
      <div className={cls}>{chg}</div>
    </div>
  );
}

function Header({ stocks, niftyIndex, live, spinning, updated, onRefresh }) {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <div className="logo">Nifty<em>50</em></div>
        <IndexStat stocks={stocks} niftyIndex={niftyIndex} />
        <div className="hdr-r">
          <MarketPill live={live} />
          <a href="/impact.html" className="btn" style={{ textDecoration: 'none' }}>⚡ Impact Calc</a>
          <a href="/impact.html#indices" className="btn" style={{ textDecoration: 'none' }}>📊 Indices</a>
          <a href="/news.html" className="btn" style={{ textDecoration: 'none' }}>📰 News</a>
          <RefreshButton spinning={spinning} onClick={onRefresh} />
          <div className="upd">{updated}</div>
        </div>
      </div>
    </header>
  );
}
