// Gainers & losers inside one index: /api/index-movers?id=it
// Fetches every constituent's price and change (all in parallel), then returns the
// top N gainers and losers (N = 10, or 5 for Nifty Energy) plus advance/decline counts.
const { INDICES, CONSTITUENTS } = require("../indexData.js");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

async function quote([sym, name]) {
  const ySym = `${sym}.NS`;
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d&includePrePost=false`, { headers: HEADERS });
      if (!res.ok) continue;
      const m = (await res.json())?.chart?.result?.[0]?.meta;
      const price = m?.regularMarketPrice, prev = m?.chartPreviousClose ?? m?.previousClose;
      if (!price || !prev) continue;
      return { sym: ySym, name, price, prev, chg: price - prev, chgPct: ((price - prev) / prev) * 100, ok: true };
    } catch (e) { continue; }
  }
  return { sym: ySym, name, ok: false };
}

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async function (event) {
  const id = (event.queryStringParameters || {}).id;
  const ix = INDICES.find((x) => x.id === id);
  if (!ix || !ix.movers) return reply(400, { ok: false, error: "No gainers/losers for this index" });

  const list = CONSTITUENTS[ix.movers];
  const quotes = (await Promise.all(list.map(quote))).filter((q) => q.ok);
  if (!quotes.length) return reply(502, { ok: false, error: "Yahoo Finance requests failed" });

  const n = ix.moversN || 10;
  const gainers = quotes.filter((q) => q.chgPct >= 0).sort((a, b) => b.chgPct - a.chgPct).slice(0, n);
  const losers = quotes.filter((q) => q.chgPct < 0).sort((a, b) => a.chgPct - b.chgPct).slice(0, n);

  return reply(200, {
    ok: true, id: ix.id, name: ix.name, n,
    total: list.length, fetched: quotes.length,
    advances: quotes.filter((q) => q.chgPct > 0).length,
    declines: quotes.filter((q) => q.chgPct < 0).length,
    unchanged: quotes.filter((q) => q.chgPct === 0).length,
    gainers, losers,
  });
};
