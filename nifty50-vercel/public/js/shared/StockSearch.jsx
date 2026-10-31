/**
 * Autosuggest search over every NSE-listed stock (public/data/nse-stocks.json, built from
 * NSE's EQUITY_L.csv by scripts/build_stock_list.py). The list loads the first time the box
 * is focused. Matches rank: exact symbol → symbol starts with → name starts with →
 * a word in the name starts with → symbol / name contains. Nifty 50 matches show live price.
 * ↑ / ↓ to move, Enter to open, Esc to clear.
 * Used on the Dashboard (full width) and in the Impact page header (compact).
 */
let NSE_LIST = null;        // [[SYMBOL, Name], ...] once loaded
let NSE_LOADING = null;

function loadNseList() {
  if (NSE_LIST) return Promise.resolve(NSE_LIST);
  if (!NSE_LOADING) {
    NSE_LOADING = fetch('/data/nse-stocks.json')
      .then((r) => r.json())
      .then((j) => (NSE_LIST = (j.stocks || []).map(([s, n]) => ({ s, n, sl: s.toLowerCase(), nl: n.toLowerCase() }))))
      .catch(() => (NSE_LIST = []));
  }
  return NSE_LOADING;
}

// Old / popular names → current NSE symbol (renamed companies, brand names)
const SEARCH_ALIASES = {
  zomato: ['ETERNAL'], blinkit: ['ETERNAL'],
  ltimindtree: ['LTM'], mindtree: ['LTM'], 'lti ': ['LTM'],
  'tata motors': ['TMPV', 'TMCV'], tatamotors: ['TMPV', 'TMCV'],
  indigo: ['INDIGO'], interglobe: ['INDIGO'],
  paytm: ['PAYTM'], nykaa: ['NYKAA'], policybazaar: ['POLICYBZR'],
};

function rankMatches(list, term, limit = 8) {
  const out = [];
  const bySym = new Map(list.map((x) => [x.s, x]));
  for (const [alias, syms] of Object.entries(SEARCH_ALIASES)) {
    if (alias.trim().startsWith(term) || term.startsWith(alias.trim())) {
      syms.forEach((sy, i) => { const x = bySym.get(sy); if (x) out.push({ x, score: -1 + i * 0.01 }); });
    }
  }
  for (const x of list) {
    let score = -1;
    if (x.sl === term) score = 0;
    else if (x.sl.startsWith(term)) score = 1;
    else if (x.nl.startsWith(term)) score = 2;
    else if (x.nl.split(/[\s&().,-]+/).some((w) => w.startsWith(term))) score = 3;
    else if (x.sl.includes(term)) score = 4;
    else if (x.nl.includes(term)) score = 5;
    if (score >= 0 && !out.some((o) => o.x === x)) out.push({ x, score });
  }
  out.sort((a, b) => a.score - b.score || a.x.s.length - b.x.s.length || a.x.s.localeCompare(b.x.s));
  return out.slice(0, limit).map((o) => o.x);
}

/** Bold the matched part of a label */
function Hl({ text, term }) {
  const i = term ? text.toLowerCase().indexOf(term) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<b className="srch-hl">{text.slice(i, i + term.length)}</b>{text.slice(i + term.length)}</>;
}

function StockSearch({ stocks, onSelect, compact = false }) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [list, setList] = useState(NSE_LIST);
  const [active, setActive] = useState(0);
  const term = q.trim().toLowerCase();

  const live = useMemo(() => Object.fromEntries(stocks.map((s) => [s.sym, s])), [stocks]);

  const results = useMemo(() => {
    if (!term) return [];
    if (list && list.length) {
      return rankMatches(list, term).map((x) => ({ sym: `${x.s}.NS`, label: x.n, sub: x.s, stock: live[`${x.s}.NS`] || null }));
    }
    // list not loaded yet: search the Nifty 50 we already have
    return stocks.filter((s) => s.name.toLowerCase().includes(term) || ticker(s.sym).toLowerCase().includes(term))
      .slice(0, 8).map((s) => ({ sym: s.sym, label: s.name, sub: ticker(s.sym), stock: s }));
  }, [term, list, live, stocks]);

  useEffect(() => { setActive(0); }, [term]);

  const pick = (r) => { onSelect(r.sym); setQ(''); };

  return (
    <div className={`srch${compact ? ' compact' : ''}`}>
      <input
        className="srch-in"
        placeholder={compact ? '🔍  Search stock…' : '🔍  Search any NSE stock — name or symbol (e.g. Infosys, TCS, Zomato)'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { setFocus(true); if (!list) loadNseList().then(setList); }}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && results[active]) pick(results[active]);
          if (e.key === 'Escape') setQ('');
        }}
      />
      {focus && term && (
        <div className="srch-list">
          {results.length === 0 && <div className="srch-empty">{list ? `No NSE stock matches "${q.trim()}"` : 'Loading stock list…'}</div>}
          {results.map((r, i) => {
            const up = r.stock ? r.stock.chgPct >= 0 : true;
            return (
              <div key={r.sym} className={`srch-it${i === active ? ' on' : ''}`} onMouseDown={() => pick(r)} onMouseEnter={() => setActive(i)}>
                <div className="srch-l">
                  <div className="srch-n"><Hl text={r.label} term={term} /></div>
                  <div className="srch-s"><Hl text={r.sub} term={term} />{r.stock ? ' · Nifty 50' : ''}</div>
                </div>
                {r.stock && (
                  <div className="srch-r">
                    <span>₹{fp(r.stock.price)}</span>
                    <span className={up ? 'up' : 'dn'}>{up ? '+' : ''}{r.stock.chgPct.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
