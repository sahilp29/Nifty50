function LoadingScreen({ count }) {
  return (
    <div className="loading-screen">
      <div className="ld-title">Fetching Nifty 50…</div>
      <div className="ld-bar"><div className="ld-fill" /></div>
      <div className="ld-count">{count}</div>
      <div className="ld-sub">Firing 50 parallel requests via Vercel serverless</div>
    </div>
  );
}
