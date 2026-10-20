// ── Shared hooks ──

/** setInterval that always calls the latest callback */
function useInterval(callback, delay) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);
  useEffect(() => {
    if (delay == null) return undefined;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Filter + sort state for the data tables, matching the original pages exactly:
 *  - new data or a filter change rebuilds the list from the API order, then sorts it;
 *  - clicking a header re-sorts the list as currently shown (so rows with equal
 *    values keep their previous relative order);
 *  - the ↑/↓ arrow only appears after the first header click.
 */
function useSortableTable(rows, initialCol, filters) {
  const [filt, setFiltState] = useState('all');
  const [sortCol, setSortCol] = useState(initialCol);
  const [sortDir, setSortDir] = useState(-1);
  const [sortTh, setSortTh] = useState(null);
  const [view, setView] = useState([]);

  const build = (f, col, dir) => {
    const pred = filters[f];
    return sortRows(pred ? rows.filter(pred) : rows, col, dir);
  };

  // New data → rebuild with the current filter and sort
  useEffect(() => { setView(build(filt, sortCol, sortDir)); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilt(f) {
    setFiltState(f);
    setView(build(f, sortCol, sortDir));
  }

  function sortBy(col) {
    const dir = sortCol === col ? sortDir * -1 : -1;
    setSortCol(col);
    setSortDir(dir);
    setSortTh({ col, dir });
    setView((v) => sortRows(v, col, dir));
  }

  const thClass = (col) => (sortTh && sortTh.col === col ? (sortTh.dir === -1 ? 'desc' : 'asc') : '');

  return { filt, setFilt, filtered: view, sortBy, thClass };
}
