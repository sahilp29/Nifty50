// Extra live data for the Impact page:
//  - useImpact15: each stock's move in the latest 15-minute candle (refreshed every 90s)
//  - useEvents:   today's R / D / S badges for the Nifty 50 (refreshed every 30 min)
function useImpact15() {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/impact15`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) { /* keep the last good data */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  useInterval(load, 90_000);
  return data;
}

function useEvents() {
  const [badges, setBadges] = useState({});
  const load = useCallback(async () => {
    // D / S (and R if Yahoo allows it) from /api/events; R from the Python results function
    const [ev, rs] = await Promise.all([
      fetch(`${API}/events`).then((r) => r.json()).catch(() => null),
      fetch(`${API}/results?set=nifty50`).then((r) => r.json()).catch(() => null),
    ]);
    const merged = {};
    for (const [sym, list] of Object.entries(ev?.ok ? ev.badges || {} : {})) merged[sym] = [...list];
    for (const [sym, list] of Object.entries(rs?.ok ? rs.badges || {} : {})) {
      const cur = merged[sym] || [];
      merged[sym] = cur.some((b) => b.t === 'R') ? cur : [...list, ...cur];
    }
    if (ev?.ok || rs?.ok) setBadges(merged);
  }, []);
  useEffect(() => { load(); }, [load]);
  useInterval(load, 30 * 60_000);
  return badges;
}

/** Red letter badges next to a stock name: R results · D ex-dividend · S split/bonus */
function EventBadges({ list }) {
  if (!list || !list.length) return null;
  return (
    <span className="ev-wrap">
      {list.map((b, i) => <span key={i} className="ev-badge" title={b.note}>{b.t}</span>)}
    </span>
  );
}

/** World indices card (Asia / Europe / US) next to Indices; tap one for its chart */
const GLOBAL_GROUPS = ['Asia', 'Europe', 'US'];
function GlobalIndicesCard({ indices, onOpen }) {
  return (
    <div className="gl-card">
      <div className="sec-name" style={{ color: '#fff' }}>Global Indices</div>
      {!indices.length ? (
        <div className="ld-sub" style={{ marginTop: 10 }}>Loading…</div>
      ) : GLOBAL_GROUPS.map((g) => {
        const list = indices.filter((x) => x.group === g);
        if (!list.length) return null;
        return (
          <React.Fragment key={g}>
            <div className="gi-group">{g}</div>
            <div className="gl-grid">
              {list.map((ix) => {
                const up = (ix.chgPct ?? 0) >= 0;
                return (
                  <div className={`gl-it${ix.ok ? ' clickable' : ''}`} key={ix.id} onClick={() => ix.ok && onOpen(ix.id)} title={ix.ok ? 'Tap for chart' : 'n/a on Yahoo'}>
                    <div className="gl-n">
                      {ix.ok && ix.open != null && <span className={`gi-dot${ix.open ? ' on' : ''}`} title={ix.open ? 'Open' : 'Closed'} />}
                      {ix.name}
                    </div>
                    <div className="gl-p">{ix.ok ? ix.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
                    <div className={`gl-c ${!ix.ok || ix.chgPct == null ? 'na' : up ? 'up' : 'dn'}`}>
                      {ix.ok && ix.chgPct != null ? `${up ? '+' : ''}${ix.chgPct.toFixed(2)}%` : 'n/a'}
                    </div>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
