// Indices on the Impact page: a compact card of key indices next to Global Cues,
// expandable to all 22 (grouped). Tapping an index opens its chart card.
const KEY_INDEX_IDS = ['nifty50', 'sensex', 'niftybank', 'finnifty', 'it', 'midcap100', 'smallcap100', 'next50', 'vix'];
const KEY_INDEX_LABELS = {
  nifty50: 'Nifty 50', sensex: 'Sensex', niftybank: 'Bank Nifty', finnifty: 'Fin Nifty', it: 'Nifty IT',
  midcap100: 'Midcap 100', smallcap100: 'Smallcap 100', next50: 'Next 50', vix: 'India VIX',
};

function IndicesMini({ indices, expanded, onToggle, onOpen }) {
  const key = KEY_INDEX_IDS.map((id) => indices.find((x) => x.id === id)).filter(Boolean);
  return (
    <div className="gl-card" id="indices">
      <div className="ixm-hd">
        <div className="sec-name" style={{ color: '#fff', margin: 0 }}>Indices</div>
        <button className="ixm-btn" onClick={onToggle}>{expanded ? 'Hide ▲' : `All ${indices.length || 22} ▼`}</button>
      </div>
      {!indices.length ? (
        <div className="ld-sub" style={{ marginTop: 10 }}>Loading indices…</div>
      ) : (
        <div className="gl-grid">
          {key.map((ix) => {
            if (!ix.ok) {
              return <div className="gl-it" key={ix.id}><div className="gl-n">{KEY_INDEX_LABELS[ix.id] || ix.name}</div><div className="gl-p">—</div><div className="gl-c na">n/a</div></div>;
            }
            const up = (ix.chgPct ?? 0) >= 0;
            return (
              <div className="gl-it clickable" key={ix.id} onClick={() => onOpen(ix.id)} title="Tap for chart">
                <div className="gl-n">{KEY_INDEX_LABELS[ix.id] || ix.name}</div>
                <div className="gl-p">{fp(ix.price)}</div>
                <div className={`gl-c ${up ? 'up' : 'dn'}`}>{ix.chgPct != null ? `${up ? '+' : ''}${ix.chgPct.toFixed(2)}%` : '—'}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IndicesAll({ indices, onOpen, onClose }) {
  return (
    <div className="sec-detail ixm-all">
      <div className="sd-hd">
        <span className="sd-title">All Indices</span>
        <span className="sd-sub">Sectoral, Nifty 50 & Sensex cards show gainers & losers (▲▼)</span>
        <button className="sd-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {INDEX_GROUPS.map((g) => {
        const list = indices.filter((x) => x.group === g);
        if (!list.length) return null;
        return (
          <React.Fragment key={g}>
            <div className="ixm-group">{g}</div>
            <div className="ix-grid">
              {list.map((ix) => <IndexCard key={ix.id} ix={ix} onOpen={onOpen} />)}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
