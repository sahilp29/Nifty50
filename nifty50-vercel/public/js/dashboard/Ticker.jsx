/** Scrolling tape of the 20 biggest movers (rendered twice for a seamless loop) */
function Ticker({ stocks }) {
  const top = [...stocks].sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct)).slice(0, 20);
  const items = (copy) =>
    top.map((s) => {
      const up = s.chgPct >= 0;
      return (
        <span className="ti" key={`${copy}-${s.sym}`}>
          <span className="ti-n">{s.name}</span>
          <span className="ti-p">₹{fp(s.price)}</span>
          <span className={`ti-c ${up ? 'up' : 'dn'}`}>{up ? '▲' : '▼'}{Math.abs(s.chgPct).toFixed(2)}%</span>
        </span>
      );
    });
  return (
    <div className="tape">
      <div className="tape-inner">{items('a')}{items('b')}</div>
    </div>
  );
}
