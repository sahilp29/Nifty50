// Last 15 minutes for the Nifty 50: /api/impact15
// For each stock, the move of its latest 15-minute candle (close vs the previous candle's
// close, or vs yesterday's close for the day's first candle), as a % of yesterday's close.
// The Impact page turns that into Nifty points with the same weights as the daily impact:
//   points = Nifty base × (weight / total weight) × move%
// Also returns the actual Nifty 50 move over the same window. Cached 1 minute.
const Y = require("../yahooSession.js");
const { CONSTITUENTS } = require("../indexData.js");

async function lastCandle(sym) {
  const j = await Y.getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=15m&range=1d&includePrePost=false`);
  const r = j?.chart?.result?.[0];
  const ts = r?.timestamp || [], close = r?.indicators?.quote?.[0]?.close || [];
  const prevClose = r?.meta?.chartPreviousClose ?? r?.meta?.previousClose;
  // Yahoo stamps the still-forming candle with the stock's last trade time (e.g. 12:21:34),
  // which differs per stock. Snap every bar to its 15-minute slot and keep the latest close
  // per slot, so all 50 stocks line up on the same window.
  const slots = new Map();
  ts.forEach((t, i) => { if (close[i] != null) slots.set(Math.floor(t / 900) * 900, close[i]); });
  const bars = [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([t, c]) => ({ t, c }));
  if (!bars.length || !prevClose) return null;
  const lastBar = bars[bars.length - 1];
  const before = bars.length > 1 ? bars[bars.length - 2].c : prevClose;
  return { start: lastBar.t, movePct: ((lastBar.c - before) / prevClose) * 100, points: lastBar.c - before };
}

const hhmm = (t) => new Date((t + Y.IST) * 1000).toISOString().slice(11, 16);

exports.handler = async function () {
  const list = CONSTITUENTS.nifty50 || [];
  const [index, ...stocks] = await Promise.all([lastCandle("^NSEI"), ...list.map(([code]) => lastCandle(`${code}.NS`).catch(() => null))]);

  // The window = the most common latest-candle start time (ignores stocks with stale data)
  const counts = {};
  stocks.forEach((s) => { if (s) counts[s.start] = (counts[s.start] || 0) + 1; });
  const start = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || index?.start || null;

  const moves = {};
  list.forEach(([code], i) => {
    const s = stocks[i];
    if (s && s.start === start) moves[`${code}.NS`] = s.movePct;
  });

  return {
    statusCode: Object.keys(moves).length ? 200 : 502,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
    body: JSON.stringify({
      ok: Object.keys(moves).length > 0,
      window: start ? { from: hhmm(start), to: hhmm(start + 900), date: Y.istDate(start) } : null,
      niftyPoints: index && index.start === start ? index.points : null,
      matched: Object.keys(moves).length, total: list.length,
      moves,
    }),
  };
};
