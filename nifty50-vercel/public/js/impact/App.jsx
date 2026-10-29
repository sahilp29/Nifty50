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
  const ready = d.rows.length > 0 && d.niftyLevel != null;
  const [selected, setSelected] = useState(null); // symbol shown in the detail drawer
  const closeDrawer = useCallback(() => setSelected(null), []);
  // Live extras: last-15-minute moves and today's R/D/S badges, merged into the rows
  const i15 = useImpact15();
  const events = useEvents();
  const totalW = useMemo(() => d.rows.reduce((s, r) => s + r.weight, 0) || 1, [d.rows]);
  const rows = useMemo(() => d.rows.map((r) => {
    const mv = i15?.moves?.[r.sym];
    const pts15 = mv != null && d.impactBase ? d.impactBase * (r.weight / totalW) * (mv / 100) : null;
    return { ...r, pts15, move15: mv ?? null, badges: events[r.sym] || null, window15: i15?.window || null };
  }), [d.rows, d.impactBase, totalW, i15, events]);
  const impactMap = useMemo(() => Object.fromEntries(rows.map((r) => [r.sym, r])), [rows]);

  // Indices (moved here from the old Indices page)
  const ixData = useIndices();
  const glData = useIndices('global');
  const [ixExpanded, setIxExpanded] = useState(() => window.location.hash === '#indices');
  const [openIndexId, setOpenIndexId] = useState(null);
  const openIx = [...ixData.indices, ...glData.indices].find((x) => x.id === openIndexId) || null;
  const closeIndex = useCallback(() => setOpenIndexId(null), []);
  const closeStockAll = useCallback(() => { setSelected(null); setOpenIndexId(null); }, []);
  const backToIndex = useCallback(() => setSelected(null), []);

  // Links from other pages (/impact.html#indices) scroll to the indices card
  useEffect(() => {
    if (window.location.hash === '#indices' && ready) {
      setTimeout(() => document.getElementById('indices')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [ready]);

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
              <SectorGrid rows={d.rows} niftyLevel={d.niftyLevel} globals={d.globals} onSelect={setSelected}>
                <GlobalIndicesCard indices={glData.indices} onOpen={setOpenIndexId} />
                <IndicesMini indices={ixData.indices} expanded={ixExpanded} onToggle={() => setIxExpanded((v) => !v)} onOpen={setOpenIndexId} />
                {ixExpanded && <IndicesAll indices={ixData.indices} onOpen={setOpenIndexId} onClose={() => setIxExpanded(false)} />}
              </SectorGrid>

              <SectionHead label="What-If Simulator"><div className="sc">Drag to test a move</div></SectionHead>
              <WhatIf rows={d.rows} niftyLevel={d.niftyLevel} impactBase={d.impactBase} />

              <SectionHead label="All 50 — Detailed Impact" />
              <ImpactTable rows={rows} niftyLevel={d.niftyLevel} onSelect={setSelected} window15={i15?.window || null} nifty15={i15?.niftyPoints ?? null} />
            </>
          )}
        </div>
      </div>

      <IndexDrawer ix={selected ? null : openIx} onClose={closeIndex} onSelectStock={setSelected} />
      <StockDrawer
        sym={selected}
        stocks={d.rows}
        impact={impactMap}
        onClose={openIx ? closeStockAll : closeDrawer}
        showImpactLink={false}
        onBack={openIx ? backToIndex : null}
        backLabel={openIx ? openIx.name : ''}
      />

      <ImpactFooter />
      <Watermark />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ImpactApp />);
