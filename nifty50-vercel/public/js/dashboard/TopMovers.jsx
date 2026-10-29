function MoverList({ list, isVol = false, maxV = 1, flash, onSelect }) {
  return (
    <div className="mp-list">
      {list.map((s) => {
        const up = s.chgPct >= 0;
        const pct = isVol ? ((s.vol / maxV) * 100).toFixed(0) : null;
        return (
          <div className={`mi${flash[s.sym] ? ` flash-${flash[s.sym]}` : ''}`} key={s.sym} onClick={() => onSelect(s.sym)}>
            <div><div className="mi-n">{s.name}</div><div className="mi-s">{ticker(s.sym)}</div></div>
            <div className="mi-p">₹{fp(s.price)}</div>
            <div className={`mi-c ${up ? 'up' : 'dn'}`}>{isVol ? fv(s.vol) : `${up ? '+' : ''}${s.chgPct.toFixed(2)}%`}</div>
            {isVol && <div className="vbar-row"><div className="vbar" style={{ width: `${pct}%` }} /></div>}
          </div>
        );
      })}
    </div>
  );
}

function Panel({ badge, badgeClass, title, children }) {
  return (
    <div className="mpanel">
      <div className="mp-hd"><span className={`badge ${badgeClass}`}>{badge}</span>{title}</div>
      {children}
    </div>
  );
}

function TopMovers({ stocks, flash, onSelect }) {
  const byG = [...stocks].sort((a, b) => b.chgPct - a.chgPct);
  const maxV = Math.max(...stocks.map((s) => s.vol || 0));
  const active = [...stocks].filter((s) => s.vol).sort((a, b) => b.vol - a.vol).slice(0, 5);
  return (
    <div className="top3">
      <Panel badge="▲" badgeClass="gb" title="Top Gainers"><MoverList list={byG.slice(0, 5)} flash={flash} onSelect={onSelect} /></Panel>
      <Panel badge="▼" badgeClass="lb" title="Top Losers"><MoverList list={byG.slice(-5).reverse()} flash={flash} onSelect={onSelect} /></Panel>
      <Panel badge="⚡" badgeClass="vb" title="Most Active"><MoverList list={active} isVol maxV={maxV} flash={flash} onSelect={onSelect} /></Panel>
    </div>
  );
}
