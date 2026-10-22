// All tracked indices: /api/indices
// For each index: value, change, day high/low and a small intraday sparkline (5-min closes).
const { INDICES } = require("../indexData.js");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};
const resolved = new Map(); // id → Yahoo symbol that worked (kept while the function stays warm)

async function chart(symbol) {
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`, { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) continue;
      const cr = (await res.json())?.chart?.result?.[0];
      const m = cr?.meta;
      if (!m?.regularMarketPrice) continue;
      return cr;
    } catch (e) { continue; }
  }
  return null;
}

async function fetchIndex(ix) {
  const tryList = resolved.has(ix.id) ? [resolved.get(ix.id)] : ix.candidates;
  for (const symbol of tryList) {
    const cr = await chart(symbol);
    if (!cr) continue;
    resolved.set(ix.id, symbol);
    const m = cr.meta;
    const price = m.regularMarketPrice;
    const prev = m.chartPreviousClose ?? m.previousClose ?? null;
    const closes = (cr.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
    const step = Math.max(1, Math.ceil(closes.length / 80)); // keep the sparkline light
    const spark = closes.filter((_, i) => i % step === 0 || i === closes.length - 1);
    const chg = prev ? price - prev : null;
    return {
      id: ix.id, name: ix.name, group: ix.group, symbol, ok: true,
      price, prev, chg, chgPct: prev ? (chg / prev) * 100 : null,
      high: m.regularMarketDayHigh ?? null, low: m.regularMarketDayLow ?? null,
      time: m.regularMarketTime ?? null, spark,
      movers: !!ix.movers,
    };
  }
  return { id: ix.id, name: ix.name, group: ix.group, symbol: ix.candidates[0], ok: false, movers: !!ix.movers };
}

exports.handler = async function () {
  const results = await Promise.all(INDICES.map(fetchIndex));
  return {
    statusCode: results.some((r) => r.ok) ? 200 : 502,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
    body: JSON.stringify({ indices: results, ts: Date.now() }),
  };
};
