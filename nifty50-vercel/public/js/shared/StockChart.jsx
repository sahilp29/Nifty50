/**
 * Candlestick + volume chart (TradingView Lightweight Charts, loaded from the CDN).
 * Times are shifted to IST because the library displays timestamps as UTC.
 */
function StockChart({ candles, interval }) {
  const box = useRef(null);

  useEffect(() => {
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
    price.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });

    const IST = 19800;
    price.setData(candles.map((k) => ({ time: k.t + IST, open: k.o, high: k.h, low: k.l, close: k.c })));
    vol.setData(candles.map((k) => ({ time: k.t + IST, value: k.v, color: k.c >= k.o ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)' })));
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles, interval]);

  return <div className="dr-chart" ref={box} />;
}
