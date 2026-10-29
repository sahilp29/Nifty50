/** Gold, Brent, USD/INR, ADRs… shown in the space after the last sector card */
function GlobalCues({ globals, onSelect }) {
  if (!globals.length) return null;
  return (
    <div className="gl-card">
      <div className="sec-name" style={{ color: '#fff' }}>Global Cues</div>
      <div className="gl-grid">
        {globals.map((x) => {
          if (!x.ok) {
            return (
              <div className="gl-it clickable" key={x.sym || x.label} onClick={() => x.sym && onSelect(x.sym)}>
                <div className="gl-n">{x.label}</div><div className="gl-p">—</div><div className="gl-c na">n/a</div>
              </div>
            );
          }
          const up = x.chgPct >= 0;
          const tt = x.time ? new Date(x.time * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          const inr = x.cur === 'INR';
          const price = (inr ? '₹' : '') + x.price.toLocaleString(inr ? 'en-IN' : 'en-US', { minimumFractionDigits: x.dec, maximumFractionDigits: x.dec });
          return (
            <div className="gl-it clickable" key={x.sym || x.label} title={(x.note || 'Last traded ' + tt) + ' · tap for chart'} onClick={() => onSelect(x.sym)}>
              <div className="gl-n">{x.label}</div>
              <div className="gl-p">{price}</div>
              <div className={`gl-c ${up ? 'up' : 'dn'}`}>{signed(x.chgPct, 2)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Expanded panel: every stock in the clicked sector with its own point impact */
function SectorDetail({ sector, rows, onClose, onSelect }) {
  const list = rows.filter((r) => r.sector === sector).sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
  const total = list.reduce((s, r) => s + r.pts, 0);
  const absTotal = list.reduce((s, r) => s + Math.abs(r.pts), 0) || 1;
  const col = SECTOR_COLORS[sector] || '#94a3b8';
  return (
    <div className="sec-detail" style={{ borderColor: `${col}66` }}>
      <div className="sd-hd">
        <span className="sd-dot" style={{ background: col }} />
        <span className="sd-title">{sector}</span>
        <span className="sd-sub">{list.length} stocks · net <b className={total >= 0 ? 'up' : 'dn'}>{signed(total)} pts</b></span>
        <button className="sd-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="sd-grid">
        {list.map((r) => {
          const up = r.pts >= 0;
          return (
            <div className={`sd-card clickable ${up ? 'up' : 'dn'}`} key={r.sym} onClick={() => onSelect(r.sym)} title="Open chart & details">
              <div className="sd-name">{r.name}</div>
              <div className="sd-sym">{ticker(r.sym)} · {r.weight.toFixed(2)}% wt</div>
              <div className={`sd-pts ${up ? 'up' : 'dn'}`}>{signed(r.pts)} pts</div>
              <div className="sd-row"><span>{signed(r.chgPct, 2)}%</span><span>₹{fp(r.price)}</span></div>
              <div className="sd-share"><div style={{ width: `${(Math.abs(r.pts) / absTotal) * 100}%`, background: up ? 'var(--up)' : 'var(--dn)' }} /></div>
              <div className="sd-meta">{((Math.abs(r.pts) / absTotal) * 100).toFixed(0)}% of sector's move</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One card per sector, strongest contribution first, then the Global Cues card.
 *  Clicking a card opens that sector's stocks right below it; click again (or ✕) to close. */
function SectorGrid({ rows, niftyLevel, globals, onSelect, children }) {
  const [open, setOpen] = useState(null);
  const secMap = {};
  rows.forEach((r) => {
    if (!secMap[r.sector]) secMap[r.sector] = { pts: 0, stocks: 0, wt: 0 };
    secMap[r.sector].pts += r.pts;
    secMap[r.sector].stocks += 1;
    secMap[r.sector].wt += r.weight;
  });
  const maxAbs = Math.max(...Object.values(secMap).map((s) => Math.abs(s.pts)));
  const sorted = Object.entries(secMap).sort((a, b) => b[1].pts - a[1].pts);

  return (
    <div className="sec-grid">
      {sorted.map(([sec, data]) => {
        const up = data.pts >= 0;
        const col = SECTOR_COLORS[sec] || '#94a3b8';
        return (
          <React.Fragment key={sec}>
          <div
            className={`sec-card clickable${open === sec ? ' sel' : ''}`}
            style={{ borderColor: open === sec ? col : `${col}22` }}
            onClick={() => setOpen(open === sec ? null : sec)}
            title="Click to see this sector's stocks"
          >
            <div className="sec-name">{sec}</div>
            <div className={`sec-pts ${up ? 'up' : 'dn'}`}>{signed(data.pts)} pts</div>
            <div style={{ fontSize: 10, color: 'var(--dim)' }}>{data.stocks} stocks · {data.wt.toFixed(1)}% weight</div>
            <div className="sec-bar">
              <div className="sec-bar-fill" style={{ width: `${((Math.abs(data.pts) / maxAbs) * 100).toFixed(0)}%`, background: col, opacity: up ? 0.8 : 0.4 }} />
            </div>
            <div className="sec-meta">{((data.pts / niftyLevel) * 100).toFixed(3)}% index contribution</div>
            <div className="sec-more">{open === sec ? '▲ hide stocks' : '▼ show stocks'}</div>
          </div>
          {open === sec && <SectorDetail sector={sec} rows={rows} onClose={() => setOpen(null)} onSelect={onSelect} />}
          </React.Fragment>
        );
      })}
      <GlobalCues globals={globals} onSelect={onSelect} />
      {children}
    </div>
  );
}
