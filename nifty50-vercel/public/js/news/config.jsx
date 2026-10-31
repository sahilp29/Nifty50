// ── News page settings ──

// Today's live blog link is found automatically by /api/liveblog.
// ▼ Backup only: used if the auto-lookup fails. You can leave this as is.
const FALLBACK_URL = "https://www.cnbctv18.com/market/stock-market-live-updates-nifty-50-expiry-today-sensex-hdfc-icici-axis-hospitals-divis-omc-sugar-stocks-vedanta-share-price-liveblog-20014552.htm/amp";

// ▼ The id of CNBC's live updates list. The frame jumps straight there on every load.
const LIVE_ANCHOR = "scroll-into-view";

const REFRESH_MS = 30000;      // reload the feed every 30s
const PAUSE_MS   = 60000;      // after you tap into the feed, wait 60s before reloading
const LOOKUP_MS  = 5 * 60000;  // re-check for a new day's blog every 5 min
