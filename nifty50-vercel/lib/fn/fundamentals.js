// Fundamentals for one stock: /api/fundamentals?sym=TCS.NS  (wrapped for Vercel in api/fundamentals.js)
// Source: Yahoo Finance fundamentals time-series (the endpoint yfinance uses) + daily prices for beta.
// Returns the raw ingredients; the stock card computes Mcap, PE, TTM PE and P/B live from the price.
// Cached on the CDN for 24h — fundamentals only change when results come out.

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

const TYPES = [
  "annualTotalRevenue", "annualNetIncome", "annualOperatingIncome", "annualNetInterestIncome",
  "annualDilutedEPS", "annualBasicEPS", "annualStockholdersEquity", "annualOrdinarySharesNumber",
  "quarterlyTotalRevenue", "quarterlyNetIncome", "quarterlyOperatingIncome", "quarterlyNetInterestIncome",
  "quarterlyDilutedEPS", "quarterlyBasicEPS", "quarterlyStockholdersEquity", "quarterlyOrdinarySharesNumber",
];

// Indian financial year labels: Mar-2026 → FY26, Sep-2026 → Q2 FY27
const fyOf = (d) => { const y = +d.slice(0, 4), m = +d.slice(5, 7); return m <= 3 ? y : y + 1; };
const fyLabel = (d) => `FY${String(fyOf(d)).slice(2)}`;
const qLabel = (d) => { const m = +d.slice(5, 7); const q = m <= 3 ? 4 : m <= 6 ? 1 : m <= 9 ? 2 : 3; return `Q${q} ${fyLabel(d)}`; };

async function getJSON(path) {
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com${path}`, { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) continue;
      return await res.json();
    } catch (e) { continue; }
  }
  return null;
}

async function timeseries(sym) {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - Math.floor(5.5 * 365 * 86400);
  const j = await getJSON(`/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(sym)}?symbol=${encodeURIComponent(sym)}&type=${TYPES.join(",")}&period1=${p1}&period2=${now}&merge=false&padTimeSeries=true&lang=en-US&region=US`);
  const out = {};
  for (const r of j?.timeseries?.result || []) {
    const type = r?.meta?.type?.[0];
    if (!type || !Array.isArray(r[type])) continue;
    out[type] = r[type]
      .filter((x) => x && x.asOfDate && x.reportedValue && Number.isFinite(x.reportedValue.raw))
      .map((x) => ({ date: x.asOfDate, value: x.reportedValue.raw }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return { series: out, reached: !!j };
}

const last = (s) => (s && s.length ? s[s.length - 1] : null);

/** Same quarter one year earlier (e.g. 2026-09-30 → 2025-09-30), YoY % */
function yoy(series) {
  const cur = last(series);
  if (!cur) return null;
  const target = `${+cur.date.slice(0, 4) - 1}${cur.date.slice(4, 7)}`;
  const prev = series.find((x) => x.date.slice(0, 7) === target);
  if (!prev || !prev.value) return { date: cur.date, value: cur.value, yoy: null };
  return { date: cur.date, value: cur.value, prevValue: prev.value, yoy: ((cur.value - prev.value) / Math.abs(prev.value)) * 100 };
}

/** Sum of the last 4 consecutive quarters (TTM) */
function ttm(series) {
  if (!series || series.length < 4) return null;
  const q = series.slice(-4);
  const months = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
  for (let i = 1; i < 4; i++) if (months(q[i - 1].date, q[i].date) !== 3) return null;
  return q.reduce((s, x) => s + x.value, 0);
}

/** Beta vs Nifty 50 from ~1 year of daily closes: cov(stock, index) / var(index) */
async function beta(sym) {
  const [a, b] = await Promise.all([
    getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`),
    getJSON(`/v8/finance/chart/%5ENSEI?interval=1d&range=1y`),
  ]);
  const closes = (j) => {
    const r = j?.chart?.result?.[0]; const m = new Map();
    (r?.timestamp || []).forEach((t, i) => { const c = r.indicators?.quote?.[0]?.close?.[i]; if (c != null) m.set(new Date((t + 19800) * 1000).toISOString().slice(0, 10), c); });
    return m;
  };
  const s = closes(a), n = closes(b);
  const days = [...s.keys()].filter((d) => n.has(d)).sort();
  const rs = [], rn = [];
  for (let i = 1; i < days.length; i++) {
    rs.push(s.get(days[i]) / s.get(days[i - 1]) - 1);
    rn.push(n.get(days[i]) / n.get(days[i - 1]) - 1);
  }
  if (rs.length < 100) return { beta: null, days: rs.length };
  const mean = (x) => x.reduce((p, v) => p + v, 0) / x.length;
  const ms = mean(rs), mn = mean(rn);
  let cov = 0, varN = 0;
  for (let i = 0; i < rs.length; i++) { cov += (rs[i] - ms) * (rn[i] - mn); varN += (rn[i] - mn) ** 2; }
  return { beta: varN ? cov / varN : null, days: rs.length };
}

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": statusCode === 200 ? "public, s-maxage=86400, stale-while-revalidate=172800" : "public, s-maxage=300",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async function (event) {
  const sym = String((event.queryStringParameters || {}).sym || "").trim().toUpperCase();
  if (!/^[A-Z0-9&\-]{1,25}\.(NS|BO)$/.test(sym)) return reply(400, { ok: false, error: "Fundamentals are available for NSE/BSE stocks only" });

  const [{ series: S, reached }, b] = await Promise.all([timeseries(sym), beta(sym).catch(() => ({ beta: null, days: 0 }))]);
  if (!reached) return reply(502, { ok: false, error: "Yahoo Finance fundamentals request failed" });

  // Banks/NBFCs: no "operating income" — use net interest income instead
  const isBankLike = !(S.quarterlyOperatingIncome?.length || S.annualOperatingIncome?.length) && !!(S.quarterlyNetInterestIncome?.length || S.annualNetInterestIncome?.length);

  // Last 4 financial years of revenue & net profit (aligned by year)
  const years = new Map();
  for (const x of S.annualTotalRevenue || []) years.set(x.date, { fy: fyLabel(x.date), date: x.date, revenue: x.value, netIncome: null });
  for (const x of S.annualNetIncome || []) {
    const row = years.get(x.date) || { fy: fyLabel(x.date), date: x.date, revenue: null, netIncome: null };
    row.netIncome = x.value; years.set(x.date, row);
  }
  const annual = [...years.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-4);

  const rev = yoy(S.quarterlyTotalRevenue);
  const pat = yoy(S.quarterlyNetIncome);
  const op = yoy(isBankLike ? S.quarterlyNetInterestIncome : S.quarterlyOperatingIncome);
  const latestQ = [rev, pat, op].filter(Boolean).map((x) => x.date).sort().pop() || null;

  const fyEps = last(S.annualDilutedEPS) || last(S.annualBasicEPS);
  const ttmEps = ttm(S.quarterlyDilutedEPS) ?? ttm(S.quarterlyBasicEPS);
  const shares = last(S.quarterlyOrdinarySharesNumber) || last(S.annualOrdinarySharesNumber);
  const equity = last(S.quarterlyStockholdersEquity) || last(S.annualStockholdersEquity);

  const data = {
    ok: true, sym,
    quarter: latestQ ? qLabel(latestQ) : null,
    bankLike: isBankLike,
    shares: shares?.value ?? null,
    eps: { fy: fyEps?.value ?? null, fyLabel: fyEps ? fyLabel(fyEps.date) : null, ttm: ttmEps },
    bookValuePerShare: equity && shares?.value ? equity.value / shares.value : null,
    beta: b.beta, betaDays: b.days,
    growth: {
      revenue: rev?.yoy ?? null,
      pat: pat?.yoy ?? null,
      op: op?.yoy ?? null,
      opLabel: isBankLike ? "NII" : "Op. profit",
    },
    annual,
    asOf: new Date().toISOString().slice(0, 10),
  };
  const empty = !annual.length && data.growth.revenue == null && data.eps.fy == null && data.shares == null;
  if (empty) return reply(404, { ok: false, error: `Yahoo has no fundamentals for ${sym}` });
  return reply(200, data);
};
