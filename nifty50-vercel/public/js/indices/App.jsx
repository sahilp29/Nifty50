// ── Indices page root ──

function IndicesHeader({ live, spinning, updated, onRefresh }) {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <a className="logo" href="/index.html">Nifty<em>50</em></a>
        <span className="page-title">📊 Indices</span>
        <div className="hdr-r">
          <a className="btn" href="/index.html">⌂ HOME</a>
          <a className="btn" href="/impact.html">⚡ Impact Calc</a>
          <MarketPill live={live} />
          <RefreshButton spinning={spinning} onClick={onRefresh} />
          <div className="upd">{updated}</div>
        </div>
      </div>
    </header>
  );
}

function IndicesApp() {
  const d = useIndices();
  const [openId, setOpenId] = useState(null);     // index card open
  const [stockSym, setStockSym] = useState(null); // stock opened from an index card
  const closeIndex = useCallback(() => setOpenId(null), []);
  const closeStock = useCallback(() => { setStockSym(null); setOpenId(null); }, []);
  const backToIndex = useCallback(() => setStockSym(null), []);

  const openIx = d.indices.find((x) => x.id === openId) || null;

  return (
    <>
      <IndicesHeader live={d.live} spinning={d.spinning} updated={d.updated} onRefresh={d.refresh} />
      <div className="page">
        {!d.indices.length && (
          <div className="loading-screen">
            {d.error ? (
              <><div className="ld-title" style={{ color: 'var(--dn)' }}>Failed to load</div><div className="ld-sub">{d.error}</div></>
            ) : (
              <><div className="ld-title">Loading indices…</div><div className="ld-bar"><div className="ld-fill" /></div></>
            )}
          </div>
        )}

        {INDEX_GROUPS.map((g) => {
          const list = d.indices.filter((x) => x.group === g);
          if (!list.length) return null;
          return (
            <React.Fragment key={g}>
              <SectionHead label={g}>
                {g === 'Sectoral' && <div className="sc">Tap for gainers & losers</div>}
              </SectionHead>
              <div className="ix-grid">
                {list.map((ix) => <IndexCard key={ix.id} ix={ix} onOpen={setOpenId} />)}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <IndexDrawer ix={stockSym ? null : openIx} onClose={closeIndex} onSelectStock={setStockSym} />
      <StockDrawer
        sym={stockSym}
        stocks={[]}
        impact={{}}
        onClose={closeStock}
        onBack={backToIndex}
        backLabel={openIx ? openIx.name : 'Back'}
      />

      <footer style={{
        borderTop: '1px solid var(--bd)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: 11, color: 'var(--dim)', maxWidth: 1440, margin: '0 auto', flexWrap: 'wrap', gap: 6,
      }}>
        <div style={{ fontFamily: 'var(--ui)', fontWeight: 900, color: 'var(--muted)' }}>
          Nifty<em style={{ color: 'var(--up)', fontStyle: 'normal' }}>50</em> Indices
        </div>
        <span style={{ color: 'var(--muted)' }}>Yahoo Finance · Vercel Serverless · ~15 min delay</span>
        <CreditLine />
      </footer>
      <Watermark />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<IndicesApp />);
