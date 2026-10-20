// Candles for one stock: /api/candles?sym=TCS.NS&interval=15m|1d
// 15m → last 5 trading days of 15-minute bars; 1d → 6 months of daily bars.
// Also returns a small quote (price, previous close, day high/low, volume, name) so
// stocks outside the Nifty 50 (opened from search) can be shown too.

const RANGES = { "15m": "5d", "1d": "6mo" };
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};
const istDate = (ts) => new Date((ts + 19800) * 1000).toISOString().slice(0, 10);

function reply(statusCode, obj, cacheSecs = 0) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      ...(cacheSecs ? { "Netlify-CDN-Cache-Control": `public, s-maxage=${cacheSecs}, stale-while-revalidate=${cacheSecs * 2}` } : {}),
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const sym = String(qs.sym || "").trim().toUpperCase();
  const interval = RANGES[qs.interval] ? qs.interval : "15m";
  if (!/^[A-Z0-9&^.\-=]{1,25}$/.test(sym)) return reply(400, { ok: false, error: "Invalid symbol" });

  for (const host of ["query1", "query2"]) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${RANGES[interval]}&includePrePost=false`;
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 404) return reply(404, { ok: false, error: `No data for ${sym}` });
      if (!res.ok) continue;
      const cr = (await res.json())?.chart?.result?.[0];
      if (!cr) continue;

      const ts = cr.timestamp || [];
      const q = cr.indicators?.quote?.[0] || {};
      const candles = [];
      ts.forEach((t, i) => {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
        if ([o, h, l, c].some((v) => v == null)) return;
        candles.push({ t, o, h, l, c, v: q.volume?.[i] || 0 });
      });
      if (!candles.length) return reply(404, { ok: false, error: `No candles for ${sym}` });

      // Previous close = last close of the day before the latest trading day
      const lastDay = istDate(candles[candles.length - 1].t);
      const before = candles.filter((k) => istDate(k.t) < lastDay);
      const m = cr.meta || {};
      const quote = {
        name: m.longName || m.shortName || sym,
        price: m.regularMarketPrice ?? candles[candles.length - 1].c,
        prev: before.length ? before[before.length - 1].c : (m.chartPreviousClose ?? null),
        high: m.regularMarketDayHigh ?? null,
        low: m.regularMarketDayLow ?? null,
        vol: m.regularMarketVolume ?? null,
        currency: m.currency || "INR",
      };
      return reply(200, { ok: true, sym, interval, candles, quote }, interval === "15m" ? 60 : 600);
    } catch (e) {
      continue;
    }
  }
  return reply(502, { ok: false, error: "Yahoo Finance request failed" });
};
