// Fundamentals + result dates for one stock: /api/fundamentals?sym=TCS.NS
// Sources (Yahoo Finance): fundamentals time-series, quoteSummary (fallback history, TTM EPS,
// upcoming results date), the earnings calendar (past result dates) and 1 year of daily prices
// (beta vs Nifty + the price move on the last result day).
// The stock card computes Mcap, PE, TTM PE and P/B live from the price. Cached 12h on the CDN.
const Y = require("../yahooSession.js");

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

async function timeseries(sym) {
  const now = Math.floor(Date.now() / 1000);
  const p1 = now - Math.floor(5.5 * 365 * 86400);
  const j = await Y.getJSON(`/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(sym)}?symbol=${encodeURIComponent(sym)}&type=${TYPES.join(",")}&period1=${p1}&period2=${now}&merge=false&padTimeSeries=true&lang=en-US&region=US`);
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

/** Same quarter one year earlier, YoY % */
function yoy(series) {
  const cur = last(series);
  if (!cur) return null;
  const target = `${+cur.date.slice(0, 4) - 1}${cur.date.slice(4, 7)}`;
  const prev = series.find((x) => x.date.slice(0, 7) === target);
  if (!prev || !prev.value) return { date: cur.date, value: cur.value, yoy: null };
  return { date: cur.date, value: cur.value, yoy: ((cur.value - prev.value) / Math.abs(prev.value)) * 100 };
}

/** Sum of the last 4 consecutive quarters (TTM) */
function ttm(series) {
  if (!series || series.length < 4) return null;
  const q = series.slice(-4);
  const months = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
  for (let i = 1; i < 4; i++) if (months(q[i - 1].date, q[i].date) !== 3) return null;
  return q.reduce((s, x) => s + x.value, 0);
}

/** Daily closes (IST date → close) for ~1 year */
async function dailyCloses(sym) {
  const j = await Y.getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`);
  const r = j?.chart?.result?.[0];
  const m = new Map();
  (r?.timestamp || []).forEach((t, i) => { const c = r.indicators?.quote?.[0]?.close?.[i]; if (c != null) m.set(Y.istDate(t), c); });
  return m;
}

/** Beta vs Nifty 50: cov(stock, index) / var(index) on daily returns */
function betaFrom(s, n) {
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

/** Up to 4 financial years from quoteSummary: income statements first, else the earnings chart */
function annualFromSummary(qs) {
  const out = new Map();
  for (const st of qs?.incomeStatementHistory?.incomeStatementHistory || []) {
    const t = Y.rawNum(st.endDate);
    if (!t) continue;
    const d = new Date(t * 1000).toISOString().slice(0, 10);
    out.set(d, { fy: fyLabel(d), date: d, revenue: Y.rawNum(st.totalRevenue) ?? null, netIncome: Y.rawNum(st.netIncome) ?? null });
  }
  if (!out.size) {
    for (const y of qs?.earnings?.financialsChart?.yearly || []) {
      const yr = +y.date;
      if (!yr) continue;
      const d = `${yr}-03-31`;
      out.set(d, { fy: `FY${String(yr).slice(2)}`, date: d, revenue: Y.rawNum(y.revenue) ?? null, netIncome: Y.rawNum(y.earnings) ?? null });
    }
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Result dates from every Yahoo source we have:
 *   quote "Earnings Date" (what Yahoo's page shows) + calendarEvents + the earnings calendar.
 * next = the earliest date from today on ("Today" when it's today);
 * last = the latest date before today;
 * result-day move = price change on the day the market reacted — the result date itself,
 * or the next trading day when results came after 3:30 PM IST.
 */
function resultsInfo(quote, qs, past, closes) {
  const today = Y.todayIST();
  const cal = qs?.calendarEvents?.earnings;
  const times = [
    quote?.earningsTimestamp, quote?.earningsTimestampStart, quote?.earningsTimestampEnd,
    ...(cal?.earningsDate || []).map(Y.rawNum),
    ...past.map((d) => Math.floor(d.getTime() / 1000)),
  ].filter(Boolean);
  const byDay = new Map(); // IST date → timestamp (keep the latest time that day)
  for (const t of times) { const d = Y.istDate(t); if (!byDay.has(d) || t > byDay.get(d)) byDay.set(d, t); }
  const days = [...byDay.keys()].sort();

  const nextDay = days.find((d) => d >= today);
  const lastDay = [...days].reverse().find((d) => d < today);
  const lastT = lastDay ? byDay.get(lastDay) : null;

  let lastMove = null, reactionDay = null;
  if (lastT && closes.size) {
    const tradingDays = [...closes.keys()].sort();
    const after = Y.istMinutes(lastT) >= 930;
    const idx = tradingDays.findIndex((x) => (after ? x > lastDay : x >= lastDay));
    if (idx > 0) {
      reactionDay = tradingDays[idx];
      lastMove = (closes.get(tradingDays[idx]) / closes.get(tradingDays[idx - 1]) - 1) * 100;
    }
  }
  const estimate = quote ? !!quote.isEarningsDateEstimate : !!cal?.isEarningsDateEstimate;
  return {
    next: nextDay || null,
    nextIsToday: nextDay === today,
    nextEstimate: nextDay ? estimate : null,
    last: lastDay || null,
    lastAfterHours: lastT ? Y.istMinutes(lastT) >= 930 : null,
    reactionDay, lastMove,
  };
}

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": statusCode === 200 ? "public, s-maxage=10800, stale-while-revalidate=21600" : "public, s-maxage=300",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async function (event) {
  const sym = String((event.queryStringParameters || {}).sym || "").trim().toUpperCase();
  if (!/^[A-Z0-9&\-]{1,25}\.(NS|BO)$/.test(sym)) return reply(400, { ok: false, error: "Fundamentals are available for NSE/BSE stocks only" });

  const [{ series: S, reached }, sc, nc, qs, past, qmap] = await Promise.all([
    timeseries(sym),
    dailyCloses(sym).catch(() => new Map()),
    dailyCloses("^NSEI").catch(() => new Map()),
    Y.quoteSummary(sym, "earnings,incomeStatementHistory,defaultKeyStatistics,calendarEvents").catch(() => null),
    Y.earningsDates(sym).catch(() => []),
    Y.quotes([sym]).catch(() => ({})),
  ]);
  const quote = qmap[sym] || null;
  if (!reached && !qs) return reply(502, { ok: false, error: "Yahoo Finance fundamentals request failed" });

  const isBankLike = !(S.quarterlyOperatingIncome?.length || S.annualOperatingIncome?.length) && !!(S.quarterlyNetInterestIncome?.length || S.annualNetInterestIncome?.length);

  // Financial years of revenue & net profit, gaps filled from quoteSummary, last 4 kept
  const years = new Map();
  for (const x of S.annualTotalRevenue || []) years.set(x.date, { fy: fyLabel(x.date), date: x.date, revenue: x.value, netIncome: null });
  for (const x of S.annualNetIncome || []) {
    const row = years.get(x.date) || { fy: fyLabel(x.date), date: x.date, revenue: null, netIncome: null };
    row.netIncome = x.value; years.set(x.date, row);
  }
  let annual = [...years.values()];
  for (const row of annualFromSummary(qs)) {
    const have = annual.find((a) => a.fy === row.fy);
    if (!have) annual.push(row);
    else { have.revenue ??= row.revenue; have.netIncome ??= row.netIncome; }
  }
  annual = annual.sort((a, b) => a.date.localeCompare(b.date)).slice(-4);

  const rev = yoy(S.quarterlyTotalRevenue);
  const pat = yoy(S.quarterlyNetIncome);
  const op = yoy(isBankLike ? S.quarterlyNetInterestIncome : S.quarterlyOperatingIncome);
  const latestQ = [rev, pat, op].filter(Boolean).map((x) => x.date).sort().pop() || null;

  const fyEps = last(S.annualDilutedEPS) || last(S.annualBasicEPS);
  const ttmEps = ttm(S.quarterlyDilutedEPS) ?? ttm(S.quarterlyBasicEPS) ?? Y.rawNum(qs?.defaultKeyStatistics?.trailingEps) ?? null;
  const shares = last(S.quarterlyOrdinarySharesNumber) || last(S.annualOrdinarySharesNumber);
  const equity = last(S.quarterlyStockholdersEquity) || last(S.annualStockholdersEquity);
  const b = betaFrom(sc, nc);

  const data = {
    ok: true, sym,
    quarter: latestQ ? qLabel(latestQ) : null,
    bankLike: isBankLike,
    shares: shares?.value ?? null,
    eps: { fy: fyEps?.value ?? null, fyLabel: fyEps ? fyLabel(fyEps.date) : null, ttm: ttmEps },
    bookValuePerShare: equity && shares?.value ? equity.value / shares.value : null,
    beta: b.beta, betaDays: b.days,
    growth: { revenue: rev?.yoy ?? null, pat: pat?.yoy ?? null, op: op?.yoy ?? null, opLabel: isBankLike ? "NII" : "Op. profit" },
    annual,
    results: resultsInfo(quote, qs, past, sc),
    asOf: new Date().toISOString().slice(0, 10),
    sources: { timeseries: reached, quoteSummary: !!qs, quote: !!quote, earningsCalendar: past.length > 0, sessionError: Y.sessionError() },
  };
  const empty = !annual.length && data.growth.revenue == null && data.eps.fy == null && data.shares == null && !data.results.next && !data.results.last;
  if (empty) return reply(404, { ok: false, error: `Yahoo has no fundamentals for ${sym}` });
  return reply(200, data);
};
