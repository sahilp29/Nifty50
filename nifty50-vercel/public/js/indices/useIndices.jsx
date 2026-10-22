const INDICES_REFRESH_MS = 90_000;
const INDEX_GROUPS = ['Benchmarks', 'F&O Indices', 'Market Cap', 'Sectoral', 'Volatility'];

/** Loads /api/indices and refreshes every 90 seconds */
function useIndices() {
  const [indices, setIndices] = useState([]);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [updated, setUpdated] = useState('');
  const [live, setLive] = useState(isNseLive);

  const load = useCallback(async () => {
    setSpinning(true);
    try {
      const res = await fetch(`${API}/indices`);
      const data = await res.json();
      if (!data.indices?.length) throw new Error(`HTTP ${res.status}`);
      setIndices(data.indices);
      setError(null);
      setUpdated(updatedLabel());
      setLive(isNseLive());
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
    setSpinning(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useInterval(load, INDICES_REFRESH_MS);
  return { indices, error, spinning, updated, live, refresh: load };
}

/** Loads an index's gainers/losers when its card is opened */
function useIndexMovers(id, enabled) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!id || !enabled) { setState({ loading: false, data: null, error: null }); return undefined; }
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetch(`${API}/index-movers?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setState(j.ok ? { loading: false, data: j, error: null } : { loading: false, data: null, error: j.error || 'No data' }); })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: e.message }); });
    return () => { alive = false; };
  }, [id, enabled]);
  return state;
}
