function Footer() {
  return (
    <footer>
      <div className="fl">Nifty<em>50</em> Tracker</div>
      <span style={{ color: 'var(--muted)' }}>Yahoo Finance · Vercel Serverless · ~15 min delay</span>
      <CreditLine />
    </footer>
  );
}
