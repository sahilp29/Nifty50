/**
 * Candlestick + volume chart (Lightweight Charts, drawing Yahoo Finance data).
 * Hover/touch a candle to see its Open, High, Low, Close and % change in the legend;
 * with no hover the legend shows the latest candle.
 *  - Change % = this candle's close vs the previous candle's close
 *    (on the 1D chart that's the day's change).
 *  - On the 15m chart, "Day" = close vs the previous day's last close.
 * Times are shifted to IST because the library displays timestamps as UTC.
 */
const IST_OFFSET = 19800;
const istDay = (t) => new Date((t + IST_OFFSET) * 1000).toISOString().slice(0, 10);

function candleInfo(candles, i, interval) {
  const k = candles[i];
  if (!k) return null;
  const prev = i > 0 ? candles[i - 1].c : null;
  const info = { ...k, chgPct: prev ? ((k.c - prev) / prev) * 100 : null, dayPct: null };
  if (interval !== '1d') {
    // last close of the previous trading day
    const day = istDay(k.t);
    for (let j = i - 1; j >= 0; j--) {
      if (istDay(candles[j].t) !== day) { info.dayPct = ((k.c - candles[j].c) / candles[j].c) * 100; break; }
    }
  }
  return info;
}

function OhlcLegend({ info, interval }) {
  if (!info) return null;
  const up = info.c >= info.o;
  const d = new Date((info.t + IST_OFFSET) * 1000);
  const when = interval === '1d'
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  const pct = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);
  const cls = (v) => (v == null ? '' : v >= 0 ? 'up' : 'dn');
  const num = (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="ohlc">
      <span className="ohlc-t">{when}</span>
      <span>O <b className={up ? 'up' : 'dn'}>{num(info.o)}</b></span>
      <span>H <b className={up ? 'up' : 'dn'}>{num(info.h)}</b></span>
      <span>L <b className={up ? 'up' : 'dn'}>{num(info.l)}</b></span>
      <span>C <b className={up ? 'up' : 'dn'}>{num(info.c)}</b></span>
      <span>Chg <b className={cls(info.chgPct)}>{pct(info.chgPct)}</b></span>
      {interval !== '1d' && <span>Day <b className={cls(info.dayPct)}>{pct(info.dayPct)}</b></span>}
    </div>
  );
}

function StockChart({ candles, interval }) {
  const box = useRef(null);
  const latest = candles?.length ? candles.length - 1 : -1;
  const [hoverIdx, setHoverIdx] = useState(null);

  useEffect(() => {
    setHoverIdx(null);
    if (!box.current || !candles?.length || !window.LightweightCharts) return undefined;
    const LC = window.LightweightCharts;
    const chart = LC.createChart(box.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#4a6480', fontFamily: 'DM Mono, monospace' },
      grid: { vertLines: { color: 'rgba(26,38,54,.6)' }, horzLines: { color: 'rgba(26,38,54,.6)' } },
      rightPriceScale: { borderColor: '#1a2636' },
      timeScale: { borderColor: '#1a2636', timeVisible: interval !== '1d', secondsVisible: false },
      crosshair: { mode: LC.CrosshairMode.Normal },
    });
    const price = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    price.priceScale().applyOptions({ scaleMargins: { top: 0.14, bottom: 0.25 } });

    price.setData(candles.map((k) => ({ time: k.t + IST_OFFSET, open: k.o, high: k.h, low: k.l, close: k.c })));
    vol.setData(candles.map((k) => ({ time: k.t + IST_OFFSET, value: k.v, color: k.c >= k.o ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)' })));
    chart.timeScale().fitContent();

    // Map chart time → candle index for the hover legend
    const idxByTime = new Map(candles.map((k, i) => [k.t + IST_OFFSET, i]));
    const onMove = (param) => {
      if (!param || param.time == null || !param.point || param.point.x < 0 || param.point.y < 0) { setHoverIdx(null); return; }
      const i = idxByTime.get(param.time);
      setHoverIdx(i == null ? null : i);
    };
    chart.subscribeCrosshairMove(onMove);

    return () => { chart.unsubscribeCrosshairMove(onMove); chart.remove(); };
  }, [candles, interval]);

  const info = candles?.length ? candleInfo(candles, hoverIdx ?? latest, interval) : null;
  return (
    <>
      <div className="dr-chart" ref={box} />
      <OhlcLegend info={info} interval={interval} />
    </>
  );
}
