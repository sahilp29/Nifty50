// ── News page root ──

function NewsApp() {
  const frameRef = useRef(null);
  const { src, openHref, label, reloadFeed } = useLiveFeed(frameRef);

  return (
    <>
      <header className="hdr"><div className="hdr-in">
        <div className="logo">Nifty<em>50</em></div>
        <div className="ttl">Market News</div>
        <div className="hdr-r">
          <a className="btn" href="/index.html">⌂ HOME</a>
          <a className="btn" href="/impact.html">⚡ Impact Calc</a>
          <a className="btn" href="/impact.html#indices">📊 Indices</a>
        </div>
      </div></header>

      <div className="bar">
        <span className="src">CNBC-TV18 · Live · <span>{label}</span></span>
        <button className="btn" onClick={reloadFeed}>↻ Refresh</button>
        <a className="btn" href={openHref || undefined} target="_blank" rel="noopener">Open ↗</a>
      </div>

      <main>
        <div className="frame">
          <iframe ref={frameRef} src={src || undefined} title="CNBC-TV18 live market blog" loading="lazy" />
        </div>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<NewsApp />);
