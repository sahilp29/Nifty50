// ── Impact Calculator page root ──

function ImpactFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--bd)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', fontSize: 11, color: 'var(--dim)', maxWidth: 1440, margin: '0 auto', flexWrap: 'wrap', gap: 6,
    }}>
      <div style={{ fontFamily: 'var(--ui)', fontWeight: 900, color: 'var(--muted)' }}>
        Nifty<em style={{ color: 'var(--up)', fontStyle: 'normal' }}>50</em> Impact Calculator
      </div>
      <span style={{ color: 'var(--muted)' }}>Yahoo Finance · Vercel Serverless · ~15 min delay</span>
      <CreditLine />
    </footer>
  );
}

function ImpactApp() {
  const d = useImpactData();
  const [selected, setSelected] = useState(null); // symbol shown in the detail drawer
  const closeDrawer = useCallback(() => setSelected(null), []);
  const impactMap = useMemo(() => Object.fromEntries(d.rows.map((r) => [r.sym, r])), [d.rows]);
  const ready = d.rows.length > 0 && d.niftyLevel != null;

  return (
    <>
      <ImpactHeader live={d.live} spinning={d.spinning} updated={d.updated} onRefresh={d.refresh} />

      <div className="page">
        {d.showLoading && <ImpactLoading error={d.loadError} />}

        <div id="content" style={{ display: d.showContent ? 'block' : 'none' }}>
          {ready && (
            <>
              <HowItWorks />
              <HeroStats rows={d.rows} niftyLevel={d.niftyLevel} />

              <SectionHead label="Cumulative Breakdown" />
              <CumulativeBar rows={d.rows} />

              <SectionHead label="Per-Stock Point Impact"><div className="sc">Sorted by absolute impact</div></SectionHead>
              <Waterfall rows={d.rows} onSelect={setSelected} />

              <SectionHead label="Sector Impact Summary"><div className="sc">Tap a sector to see its stocks</div></SectionHead>
              <SectorGrid rows={d.rows} niftyLevel={d.niftyLevel} globals={d.globals} onSelect={setSelected} />

              <SectionHead label="What-If Simulator"><div className="sc">Drag to test a move</div></SectionHead>
              <WhatIf rows={d.rows} niftyLevel={d.niftyLevel} impactBase={d.impactBase} />

              <SectionHead label="All 50 — Detailed Impact" />
              <ImpactTable rows={d.rows} niftyLevel={d.niftyLevel} onSelect={setSelected} />
            </>
          )}
        </div>
      </div>

      <StockDrawer sym={selected} stocks={d.rows} impact={impactMap} onClose={closeDrawer} showImpactLink={false} />

      <ImpactFooter />
      <Watermark />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ImpactApp />);
