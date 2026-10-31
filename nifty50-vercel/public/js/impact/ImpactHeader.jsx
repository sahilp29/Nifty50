function ImpactHeader({ live, spinning, updated, onRefresh, stocks, onSelect }) {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <a className="logo" href="/index.html">Nifty<em>50</em></a>
        <span className="page-title">⚡ Index Impact Calculator</span>
        <div className="hdr-r">
          <StockSearch stocks={stocks || []} onSelect={onSelect} compact />
          <a className="btn" href="/index.html">⌂ HOME</a>
          <MarketPill live={live} />
          <RefreshButton spinning={spinning} onClick={onRefresh} />
          <div className="upd">{updated}</div>
        </div>
      </div>
    </header>
  );
}

function ImpactLoading({ error }) {
  return (
    <div className="loading-screen">
      {error ? (
        <>
          <div className="ld-title" style={{ color: 'var(--dn)' }}>Failed to load</div>
          <div className="ld-sub">{error}</div>
        </>
      ) : (
        <>
          <div className="ld-title">Calculating Impact…</div>
          <div className="ld-bar"><div className="ld-fill" /></div>
          <div className="ld-sub">Fetching live prices · computing weighted contributions</div>
        </>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="note">
      <strong>How this works:</strong> Each stock's point impact on Nifty ={' '}
      <strong>Index Level × Weight% × Price Change%</strong>.{' '}
      Summing all 50 gives the approximate total index move.{' '}
      Actual Nifty uses a free-float market cap divisor — this is a close approximation using published weightages.
    </div>
  );
}
