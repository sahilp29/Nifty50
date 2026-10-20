/** Floating heatmap tooltip; flips to the other side of the cursor near screen edges. */
function Tooltip({ tip }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!t || !tip) return;
    const x = tip.x + 14, y = tip.y + 14;
    t.style.left = (x + t.offsetWidth > window.innerWidth ? x - t.offsetWidth - 28 : x) + 'px';
    t.style.top = (y + t.offsetHeight > window.innerHeight ? y - t.offsetHeight - 28 : y) + 'px';
  }, [tip]);

  const s = tip?.stock;
  const up = s ? s.chgPct >= 0 : true;
  return (
    <div className="tip" ref={ref} style={{ display: s ? 'block' : 'none' }}>
      {s && (
        <>
          <div className="tip-n">{s.name}</div>
          <div className="tip-r"><span className="tip-k">Symbol</span><span className="tip-v">{ticker(s.sym)}</span></div>
          <div className="tip-r"><span className="tip-k">Price</span><span className="tip-v">₹{fp(s.price)}</span></div>
          <div className="tip-r"><span className="tip-k">Change</span><span className={`tip-v ${up ? 'up' : 'dn'}`}>{up ? '+' : ''}{s.chgPct.toFixed(2)}% ({up ? '+' : '-'}₹{fp(Math.abs(s.chg))})</span></div>
          <div className="tip-r"><span className="tip-k">High / Low</span><span className="tip-v">₹{fp(s.high)} / ₹{fp(s.low)}</span></div>
          <div className="tip-r"><span className="tip-k">Volume</span><span className="tip-v">{fv(s.vol)}</span></div>
        </>
      )}
    </div>
  );
}
