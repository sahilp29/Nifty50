function StatusBox({ status }) {
  const { show, type, msg, error } = status;
  return (
    <div className={`status-box${show ? ' show' : ''} ${type}`}>
      <div className={`sb-title ${type}`}>{type === 'err' ? '⚠ Failed to fetch' : '✓ Data loaded'}</div>
      <div className="sb-body">
        {type === 'err' ? (
          <>
            <b>Error loading data:</b> {error}<br /><br />
            <b>Debug checklist:</b><br />
            1. Is this deployed on Vercel? (not just opened as a file)<br />
            2. Does <code>{API}/nifty</code> return data? Open that URL directly.<br />
            3. Check Vercel dashboard → Logs (filter: /api/nifty) for errors.<br />
            4. Yahoo Finance sometimes rate-limits — wait 30 sec and retry.
          </>
        ) : msg}
      </div>
    </div>
  );
}
