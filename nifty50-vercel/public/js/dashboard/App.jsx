// ── Dashboard page root ──

function DashboardApp() {
  const d = useNiftyData();
  const [tip, setTip] = useState(null);       // { stock, x, y } while hovering a heatmap cell
  const [selected, setSelected] = useState(null); // symbol shown in the detail drawer
  const closeDrawer = useCallback(() => setSelected(null), []);

  return (
    <>
      <Header
        stocks={d.stocks}
        niftyIndex={d.niftyIndex}
        live={d.live}
        spinning={d.spinning}
        updated={d.updated}
        onRefresh={d.refresh}
      />
      <Ticker stocks={d.stocks} />
      <Tooltip tip={tip} />

      <div className="page">
        <StatusBox status={d.status} />
        {d.showLoading && <LoadingScreen count={d.ldCount} />}

        <div id="content" style={{ display: d.showContent ? 'block' : 'none' }}>
          <StockSearch stocks={d.stocks} onSelect={setSelected} />

          <SectionHead label="Top Movers" />
          <TopMovers stocks={d.stocks} flash={d.flash} onSelect={setSelected} />

          <SectionHead label="Market Heatmap">
            <div className="sc">{d.stocks.length ? `${d.stocks.length} stocks` : ''}</div>
          </SectionHead>
          <Heatmap stocks={d.stocks} onTip={setTip} flash={d.flash} onSelect={setSelected} />

          <SectionHead label="All 50 Constituents"><div className="sc">Tap any stock for details</div></SectionHead>
          <StocksTable stocks={d.stocks} flash={d.flash} onSelect={setSelected} />
        </div>
      </div>

      <StockDrawer sym={selected} stocks={d.stocks} impact={d.impact} onClose={closeDrawer} />

      <Footer />
      <Watermark />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DashboardApp />);
