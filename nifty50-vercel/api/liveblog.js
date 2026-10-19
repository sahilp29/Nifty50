// Finds today's CNBC-TV18 "Stock Market LIVE Updates" blog link.
// It only reads link addresses from CNBC's listing pages — no article content is copied.

const SOURCES = [
  "https://www.cnbctv18.com/market/",
  "https://www.cnbctv18.com/",
  "https://www.cnbctv18.com/market/stocks/",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-IN,en;q=0.9",
};

// Matches absolute or relative links like /market/....-liveblog-20014552.htm
const LINK_RE = /(?:https?:\/\/www\.cnbctv18\.com)?(\/market\/[a-z0-9\-\/]*?liveblog-(\d+)\.htm)/gi;

async function findLatest() {
  const found = new Map(); // id -> path
  const errors = [];
  for (const src of SOURCES) {
    try {
      const res = await fetch(src, { headers: HEADERS });
      if (!res.ok) { errors.push(`${src} -> HTTP ${res.status}`); continue; }
      const html = await res.text();
      for (const m of html.matchAll(LINK_RE)) found.set(Number(m[2]), m[1]);
    } catch (e) {
      errors.push(`${src} -> ${e.message}`);
    }
    if (found.size) break; // first source with results is enough
  }
  if (!found.size) return { ok: false, errors };

  const all = [...found.entries()].sort((a, b) => b[0] - a[0]); // newest id first
  // Prefer the main daily market blog; fall back to the newest market live blog of any kind
  const daily = all.find(([, p]) => /stock-market-live|sensex-today|market-live-updates/i.test(p));
  const [id, path] = daily || all[0];
  return { ok: true, id, url: `https://www.cnbctv18.com${path}/amp`, candidates: all.slice(0, 5).map(([i, p]) => ({ id: i, path: p })) };
}

module.exports = async function (req, res) {
  try {
    const result = await findLatest();
    // Cache on Vercel's edge for 5 minutes so CNBC isn't hit on every visit
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
};
