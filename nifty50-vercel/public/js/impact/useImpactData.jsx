const IMPACT_REFRESH_MS = 90_000;

/**
 * Data loading for the Impact Calculator — mirrors the original load():
 * the point-impact maths is done server-side in /api/nifty (impactRows);
 * this page just fetches, renders and auto-refreshes every 90 seconds.
 */
function useImpactData() {
  const [rows, setRows] = useState([]);
  const [niftyLevel, setNiftyLevel] = useState(null);
  const [impactBase, setImpactBase] = useState(null); // index previous close used by the impact maths
  const [globals, setGlobals] = useState([]);
  const [showLoading, setShowLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [updated, setUpdated] = useState('');
  const [live, setLive] = useState(isNseLive);

  const load = useCallback(async () => {
    setSpinning(true);
    try {
      const res = await fetch(`${API}/nifty`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.stocks?.length) throw new Error('No data');
      if (!data.impactRows?.length) throw new Error('No impact data');

      setNiftyLevel(data.niftyLevel);
      setImpactBase(data.niftyIndex?.prev > 0 ? data.niftyIndex.prev : data.niftyLevel);
      setRows(data.impactRows);
      setGlobals(data.globals || []);
      setShowLoading(false);
      setShowContent(true);
      setUpdated(updatedLabel());
      setLive(isNseLive());
    } catch (e) {
      console.error(e);
      setLoadError(e.message);
    }
    setSpinning(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useInterval(load, IMPACT_REFRESH_MS);

  return { rows, niftyLevel, impactBase, globals, showLoading, loadError, showContent, spinning, updated, live, refresh: load };
}
