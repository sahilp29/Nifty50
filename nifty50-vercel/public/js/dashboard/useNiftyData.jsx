const DASHBOARD_REFRESH_MS = 90_000;

/**
 * Data loading for the dashboard — mirrors the original load():
 * fetch /api/nifty, keep only ok stocks, keep the last good Nifty index value,
 * show a green status box for 4s on success or the red debug box on failure,
 * and auto-refresh every 90 seconds.
 */
function useNiftyData() {
  const [stocks, setStocks] = useState([]);
  const [niftyIndex, setNiftyIndex] = useState(null);
  const [showLoading, setShowLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [ldCount, setLdCount] = useState('Requesting data from Yahoo Finance');
  const [status, setStatus] = useState({ show: false, type: 'ok', error: null, msg: '' });
  const [spinning, setSpinning] = useState(false);
  const [updated, setUpdated] = useState('');
  const [live, setLive] = useState(isNseLive);
  const [flash, setFlash] = useState({});     // { SYM: 'up' | 'dn' } for prices that changed on this refresh
  const [impact, setImpact] = useState({});   // { SYM: impact row } (sector + Nifty points) for the drawer
  const prevPrices = useRef({});
  const flashTimer = useRef(null);

  const stocksRef = useRef(stocks);
  const hideTimer = useRef(null);

  const showStatus = useCallback((next) => {
    setStatus({ show: true, ...next });
    if (next.type === 'ok') {
      // Same as the original: 4s later the box hides, whatever it shows by then
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setStatus((s) => ({ ...s, show: false })), 4000);
    }
  }, []);

  const load = useCallback(async () => {
    setSpinning(true);
    setLdCount('Contacting Vercel function…');
    try {
      const res = await fetch(`${API}/nifty`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} — ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data.stocks?.length) {
        throw new Error('Function returned empty stocks array. Check Vercel function logs.');
      }
      const good = data.stocks.filter((s) => s.ok && s.price != null);
      if (data.niftyIndex?.ok) setNiftyIndex(data.niftyIndex);
      if (good.length === 0) {
        throw new Error(`Function ran but all ${data.total} Yahoo Finance requests failed. Yahoo may be blocking — try again in a moment.`);
      }

      // Price flash: compare with the previous refresh
      const f = {};
      good.forEach((s) => {
        const p = prevPrices.current[s.sym];
        if (p != null && p !== s.price) f[s.sym] = s.price > p ? 'up' : 'dn';
        prevPrices.current[s.sym] = s.price;
      });
      setFlash(f);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash({}), 1600);
      setImpact(Object.fromEntries((data.impactRows || []).map((r) => [r.sym, r])));

      stocksRef.current = good;
      setStocks(good);
      showStatus({ type: 'ok', msg: `Loaded ${good.length} / ${data.total} stocks successfully.`, error: null });
      setLive(isNseLive());
      setShowLoading(false);
      setShowContent(true);
      setUpdated(updatedLabel());
    } catch (e) {
      setShowLoading(false);
      if (stocksRef.current.length) setShowContent(true);
      showStatus({ type: 'err', error: e.message });
      console.error('Load error:', e);
    }
    setSpinning(false);
  }, [showStatus]);

  useEffect(() => {
    load();
    return () => clearTimeout(hideTimer.current);
  }, [load]);
  useInterval(load, DASHBOARD_REFRESH_MS);

  return { stocks, flash, impact, niftyIndex, showLoading, showContent, ldCount, status, spinning, updated, live, refresh: load };
}
