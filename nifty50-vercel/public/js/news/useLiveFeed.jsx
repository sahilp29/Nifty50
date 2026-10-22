const withAnchor = (u) => u + (LIVE_ANCHOR ? '#' + LIVE_ANCHOR : '');

/**
 * Drives the embedded CNBC-TV18 live blog:
 *  - asks /api/liveblog for today's blog link (re-checked every 5 min),
 *  - reloads the frame every 30s with a cache-busting ?t=,
 *  - pauses reloads for 60s after you tap into the frame, and while the tab is hidden.
 */
function useLiveFeed(frameRef) {
  const [src, setSrc] = useState('');
  const [openHref, setOpenHref] = useState('');
  const [label, setLabel] = useState('auto-refresh 30s');

  const liveUrl = useRef(null);
  const lastLoad = useRef(Date.now());
  const lastTouch = useRef(0);

  const reloadFeed = useCallback(() => {
    if (!liveUrl.current) return;
    const bust = (liveUrl.current.includes('?') ? '&' : '?') + 't=' + Date.now();
    setSrc(withAnchor(liveUrl.current + bust));
    lastLoad.current = Date.now();
  }, []);

  const lookup = useCallback(async () => {
    let url = null;
    try {
      const r = await fetch('/api/liveblog', { cache: 'no-store' });
      const j = await r.json();
      if (j && j.ok && j.url) url = j.url;
    } catch (e) {}
    url = url || liveUrl.current || FALLBACK_URL;
    if (url !== liveUrl.current) {   // first load, or CNBC started a new day's blog
      liveUrl.current = url;
      setOpenHref(withAnchor(url));
      reloadFeed();
    }
  }, [reloadFeed]);

  useEffect(() => { lookup(); }, [lookup]);
  useInterval(lookup, LOOKUP_MS);

  // Tapping into the iframe moves focus to it → treat that as "reading" and pause reloads
  useEffect(() => {
    const onBlur = () => { if (document.activeElement === frameRef.current) lastTouch.current = Date.now(); };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [frameRef]);

  useInterval(() => {
    const now = Date.now();
    const reading = now - lastTouch.current < PAUSE_MS;
    if (!document.hidden && !reading && now - lastLoad.current >= REFRESH_MS) {
      if (document.activeElement === frameRef.current) frameRef.current.blur();
      reloadFeed();
    }
    setLabel(!liveUrl.current ? "finding today's blog…"
      : reading ? 'paused while reading'
      : 'updated ' + Math.round((now - lastLoad.current) / 1000) + 's ago');
  }, 1000);

  return { src, openHref, label, reloadFeed };
}
