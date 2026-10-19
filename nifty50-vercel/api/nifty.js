// Uses the EXACT same Yahoo Finance v8 chart approach as the working prices.js
// from the original portfolio tracker — just fires all 50 in parallel

// Nifty 50 constituents — updated Sep 30, 2026 (BSE replaces Wipro)
const NIFTY50 = [
  // Financials (12)
  { sym: "HDFCBANK.NS",    name: "HDFC Bank" },
  { sym: "ICICIBANK.NS",   name: "ICICI Bank" },
  { sym: "SBIN.NS",        name: "SBI" },
  { sym: "AXISBANK.NS",    name: "Axis Bank" },
  { sym: "KOTAKBANK.NS",   name: "Kotak Bank" },
  { sym: "BAJFINANCE.NS",  name: "Bajaj Finance" },
  { sym: "BAJAJFINSV.NS",  name: "Bajaj FinServ" },
  { sym: "SHRIRAMFIN.NS",  name: "Shriram Fin." },
  { sym: "SBILIFE.NS",     name: "SBI Life" },
  { sym: "HDFCLIFE.NS",    name: "HDFC Life" },
  { sym: "JIOFIN.NS",      name: "Jio Financial" },
  { sym: "BSE.NS",         name: "BSE Ltd" },
  // IT (4)
  { sym: "TCS.NS",         name: "TCS" },
  { sym: "INFY.NS",        name: "Infosys" },
  { sym: "HCLTECH.NS",     name: "HCL Tech" },
  { sym: "TECHM.NS",       name: "Tech Mahindra" },
  // Energy / Power (5)
  { sym: "RELIANCE.NS",    name: "Reliance" },
  { sym: "ONGC.NS",        name: "ONGC" },
  { sym: "COALINDIA.NS",   name: "Coal India" },
  { sym: "NTPC.NS",        name: "NTPC" },
  { sym: "POWERGRID.NS",   name: "Power Grid" },
  // Telecom (1)
  { sym: "BHARTIARTL.NS",  name: "Airtel" },
  // Auto / Mobility (6)
  { sym: "MARUTI.NS",      name: "Maruti" },
  { sym: "M&M.NS",         name: "M&M" },
  { sym: "TMPV.NS",        name: "Tata Motors Passenger Vehicles" },
  { sym: "BAJAJ-AUTO.NS",  name: "Bajaj Auto" },
  { sym: "EICHERMOT.NS",   name: "Eicher Motors" },
  { sym: "INDIGO.NS",      name: "IndiGo" },
  // FMCG / Consumption (4)
  { sym: "HINDUNILVR.NS",  name: "HUL" },
  { sym: "ITC.NS",         name: "ITC" },
  { sym: "NESTLEIND.NS",   name: "Nestle" },
  { sym: "TATACONSUM.NS",  name: "Tata Consumer" },
  // Retail / Consumer (2)
  { sym: "TRENT.NS",       name: "Trent" },
  { sym: "ETERNAL.NS",     name: "Eternal Ltd" },
  // Pharma / Healthcare (5)
  { sym: "SUNPHARMA.NS",   name: "Sun Pharma" },
  { sym: "DRREDDY.NS",     name: "Dr. Reddy's" },
  { sym: "CIPLA.NS",       name: "Cipla" },
  { sym: "APOLLOHOSP.NS",  name: "Apollo Hosp." },
  { sym: "MAXHEALTH.NS",   name: "Max Healthcare" },
  // Infra / Metals / Industrials (7)
  { sym: "LT.NS",          name: "L&T" },
  { sym: "ULTRACEMCO.NS",  name: "UltraCemco" },
  { sym: "GRASIM.NS",      name: "Grasim" },
  { sym: "JSWSTEEL.NS",    name: "JSW Steel" },
  { sym: "TATASTEEL.NS",   name: "Tata Steel" },
  { sym: "HINDALCO.NS",    name: "Hindalco" },
  { sym: "BEL.NS",         name: "BEL" },
  // Others (4)
  { sym: "ASIANPAINT.NS",  name: "Asian Paints" },
  { sym: "TITAN.NS",       name: "Titan" },
  { sym: "ADANIENT.NS",    name: "Adani Ent." },
  { sym: "ADANIPORTS.NS",  name: "Adani Ports" },
];

// Kept server-side: the contribution model is calculated before data reaches
// the browser. The client receives completed impact rows only.
// Weights = Tickertape free-float mcap share (Oct 9, 2026), all 50 stocks incl. BSE.
const IMPACT_WEIGHTS = {
  'HDFCBANK.NS':10.67,'ICICIBANK.NS':9.20,'SBIN.NS':3.71,'AXISBANK.NS':3.71,'KOTAKBANK.NS':3.08,'BAJFINANCE.NS':2.47,'BAJAJFINSV.NS':0.98,'SHRIRAMFIN.NS':1.69,'SBILIFE.NS':0.68,'HDFCLIFE.NS':0.50,'JIOFIN.NS':0.69,'BSE.NS':1.31,
  'TCS.NS':2.16,'INFY.NS':3.41,'HCLTECH.NS':1.20,'TECHM.NS':0.91,
  'RELIANCE.NS':7.48,'ONGC.NS':0.84,'COALINDIA.NS':0.97,'NTPC.NS':1.36,'POWERGRID.NS':1.07,'BHARTIARTL.NS':5.17,
  'MARUTI.NS':1.35,'M&M.NS':2.46,'TMPV.NS':0.56,'BAJAJ-AUTO.NS':1.03,'EICHERMOT.NS':0.92,'INDIGO.NS':1.03,
  'HINDUNILVR.NS':1.61,'ITC.NS':2.30,'NESTLEIND.NS':0.94,'TATACONSUM.NS':0.61,'TRENT.NS':0.89,'ETERNAL.NS':2.28,
  'SUNPHARMA.NS':1.84,'DRREDDY.NS':0.68,'CIPLA.NS':0.71,'APOLLOHOSP.NS':0.81,'MAXHEALTH.NS':0.61,
  'LT.NS':4.25,'ULTRACEMCO.NS':1.17,'GRASIM.NS':0.98,'JSWSTEEL.NS':1.02,'TATASTEEL.NS':1.37,'HINDALCO.NS':1.23,'BEL.NS':1.23,
  'ASIANPAINT.NS':1.03,'TITAN.NS':1.58,'ADANIENT.NS':0.87,'ADANIPORTS.NS':1.35,
};

const IMPACT_SECTORS = {
  'HDFCBANK.NS':'Financials','ICICIBANK.NS':'Financials','SBIN.NS':'Financials','AXISBANK.NS':'Financials','KOTAKBANK.NS':'Financials','BAJFINANCE.NS':'Financials','BAJAJFINSV.NS':'Financials','SHRIRAMFIN.NS':'Financials','SBILIFE.NS':'Financials','HDFCLIFE.NS':'Financials','JIOFIN.NS':'Financials','BSE.NS':'Financials',
  'TCS.NS':'IT','INFY.NS':'IT','HCLTECH.NS':'IT','TECHM.NS':'IT',
  'RELIANCE.NS':'Energy','ONGC.NS':'Energy','COALINDIA.NS':'Energy','NTPC.NS':'Energy','POWERGRID.NS':'Energy',
  'BHARTIARTL.NS':'Telecom',
  'MARUTI.NS':'Auto','M&M.NS':'Auto','TMPV.NS':'Auto','BAJAJ-AUTO.NS':'Auto','EICHERMOT.NS':'Auto','INDIGO.NS':'Auto',
  'HINDUNILVR.NS':'FMCG','ITC.NS':'FMCG','NESTLEIND.NS':'FMCG','TATACONSUM.NS':'FMCG',
  'TRENT.NS':'Retail','ETERNAL.NS':'Retail',
  'SUNPHARMA.NS':'Pharma','DRREDDY.NS':'Pharma','CIPLA.NS':'Pharma','APOLLOHOSP.NS':'Pharma','MAXHEALTH.NS':'Pharma',
  'LT.NS':'Infra','ULTRACEMCO.NS':'Infra','GRASIM.NS':'Infra','JSWSTEEL.NS':'Infra','TATASTEEL.NS':'Infra','HINDALCO.NS':'Infra','BEL.NS':'Infra',
  'ASIANPAINT.NS':'Others','TITAN.NS':'Others','ADANIENT.NS':'Others','ADANIPORTS.NS':'Others',
};

// IST calendar date of a unix timestamp (seconds)
const dateKey = (ts) => new Date((ts + 19800) * 1000).toISOString().slice(0, 10);


const YH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

// NSE cash session: Mon-Fri 09:15-15:30 IST (+5 min grace for the closing print)
function isMarketOpen(now = new Date()) {
  const ist = new Date(now.getTime() + 19800 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 35;
}

// AFTER CLOSE: no candles. Use Yahoo's last traded price (CMP) and previous close
// from meta of a 1-day request. Returns null if Yahoo's market time isn't the
// expected trading date, so the caller can fall back to the candle path.
async function fetchCmp({ sym, name }, expectedDate) {
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&includePrePost=false`, { headers: YH_HEADERS });
      if (!res.ok) continue;
      const m = (await res.json())?.chart?.result?.[0]?.meta;
      if (!m) continue;
      const price = m.regularMarketPrice;
      const prev  = m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPreviousClose;
      if (!price || !prev || !m.regularMarketTime) continue;
      const date = dateKey(m.regularMarketTime);
      if (expectedDate && date !== expectedDate) continue;
      const chg = price - prev;
      return { sym, name, price, prev, chg, chgPct: (chg / prev) * 100,
               high: m.regularMarketDayHigh, low: m.regularMarketDayLow, vol: m.regularMarketVolume ?? 0,
               ok: true, date, src: "cmp" };
    } catch (e) { continue; }
  }
  return null;
}

// Global cues shown in the blank space next to the sector cards
const GLOBALS = [
  { sym: "GC=F",  label: "Gold",       unit: "USD", dec: 1 },
  { sym: "SI=F",  label: "Silver",     unit: "USD", dec: 2 },
  { sym: "BZ=F",  label: "Brent",      unit: "USD", dec: 2 },
  { sym: "HG=F",  label: "Copper",     unit: "USD/lb", dec: 3 },
  { sym: "INR=X", label: "USD/INR",    unit: "",    dec: 3 },
  { sym: "INFY",  label: "Infy ADR",   unit: "USD", dec: 2 },
  { sym: "WIT",   label: "Wipro ADR",  unit: "USD", dec: 2 },
  { sym: "HDB",   label: "HDFC ADR",   unit: "USD", dec: 2 },
  { sym: "IBN",   label: "ICICI ADR",  unit: "USD", dec: 2 },
  { sym: "RDY",   label: "Dr Reddy ADR", unit: "USD", dec: 2 },
];

// Different markets/hours, so NO NSE-date alignment here. Price = Yahoo's last traded
// price (live while the market is open, last trade when closed); change vs Yahoo's
// previous close. Same rule for gold/silver/Brent as for everything else.
async function fetchGlobal({ sym, label, unit, dec }) {
  const mk = (price, prev, time) => ({ sym, label, unit, dec, price, prev, time, chg: price - prev, chgPct: ((price - prev) / prev) * 100, ok: true });
  const utcDay = (ts) => Math.floor(ts / 86400);
  // 1) 1-day request: last price + previous close straight from meta
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&includePrePost=false`, { headers: YH_HEADERS });
      if (!res.ok) continue;
      const m = (await res.json())?.chart?.result?.[0]?.meta;
      const price = m?.regularMarketPrice, prev = m?.chartPreviousClose ?? m?.previousClose;
      if (price && prev) return mk(price, prev, m.regularMarketTime);
    } catch (e) { continue; }
  }
  // 2) fallback: 5 daily candles
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d&includePrePost=false`, { headers: YH_HEADERS });
      if (!res.ok) continue;
      const cr = (await res.json())?.chart?.result?.[0];
      if (!cr) continue;
      const m = cr.meta || {};
      const q = cr.indicators?.quote?.[0]?.close || [];
      const ts = cr.timestamp || [];
      const c = ts.map((tt, i) => ({ t: tt, close: q[i] })).filter(x => x.close != null);
      if (!c.length) continue;
      const last = c[c.length - 1];
      const price = m.regularMarketPrice ?? last.close;
      const lastIsCurrent = m.regularMarketTime ? utcDay(m.regularMarketTime) === utcDay(last.t) : true;
      const prev = lastIsCurrent ? (c.length > 1 ? c[c.length - 2].close : null) : last.close;
      if (price && prev) return mk(price, prev, m.regularMarketTime);
    } catch (e) { continue; }
  }
  return { sym, label, unit, dec, ok: false };
}

// targetDate: the index's last trading date (YYYY-MM-DD). Every stock must use
// the candle for THAT date and the one before it, otherwise it is marked stale.
async function fetchOne({ sym, name }, targetDate) {
  // range=1mo gives ~22 trading days — plenty of candles even for newer listings.
  // We only need the last 2 valid closes, but more range = more reliable.
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo&includePrePost=false`,
  ];

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  let staleInfo = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) continue;

      const json = await res.json();
      const cr   = json?.chart?.result?.[0];
      if (!cr) continue;

      const meta       = cr.meta || {};
      const timestamps = cr.timestamp || [];
      const rawClose   = cr.indicators?.quote?.[0]?.close  || [];
      const rawHigh    = cr.indicators?.quote?.[0]?.high   || [];
      const rawLow     = cr.indicators?.quote?.[0]?.low    || [];
      const rawVol     = cr.indicators?.quote?.[0]?.volume || [];

      // Pair each bar with its timestamp, drop bars with null close, and keep
      // only ONE bar per IST date (Yahoo sometimes appends a live bar that
      // duplicates the last daily bar).
      const byDate = new Map();
      timestamps.forEach((t, i) => {
        if (rawClose[i] == null) return;
        byDate.set(dateKey(t), { t, date: dateKey(t), close: rawClose[i], high: rawHigh[i], low: rawLow[i], vol: rawVol[i] });
      });
      const candles = [...byDate.values()].sort((a, b) => a.t - b.t);
      if (candles.length === 0) continue;

      // Align to the target trading date so every stock compares the same two days.
      let idx = candles.length - 1;
      if (targetDate) {
        idx = candles.findIndex(c => c.date === targetDate);
        if (idx < 1) {
          staleInfo = { lastDate: candles[candles.length - 1].date };
          continue; // try the other Yahoo host before giving up
        }
      }
      const todayCandle = candles[idx];
      const price = todayCandle.close;
      if (!price) continue;

      let prev;
      if (idx >= 1) {
        prev = candles[idx - 1].close;
      } else {
        prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose;
      }
      if (!prev) continue;

      const chg    = price - prev;
      const chgPct = (chg / prev) * 100;
      const high   = todayCandle.high;
      const low    = todayCandle.low;
      const vol    = todayCandle.vol ?? 0;

      return { sym, name, price, prev, chg, chgPct, high, low, vol, ok: true, date: todayCandle.date };
    } catch (e) {
      continue;
    }
  }

  // Fallback for lagging symbols: a 1-day request carries its own previous close
  // (meta.chartPreviousClose). Only accepted if its market time is the target date.
  if (staleInfo && targetDate) {
    for (const host of ["query1", "query2"]) {
      try {
        const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d&includePrePost=false`, { headers: HEADERS });
        if (!res.ok) continue;
        const cr = (await res.json())?.chart?.result?.[0];
        const m = cr?.meta;
        if (!m || !m.regularMarketTime || dateKey(m.regularMarketTime) !== targetDate) continue;
        const price = m.regularMarketPrice, prev = m.chartPreviousClose ?? m.previousClose;
        if (!price || !prev) continue;
        const chg = price - prev;
        return { sym, name, price, prev, chg, chgPct: (chg / prev) * 100,
                 high: m.regularMarketDayHigh, low: m.regularMarketDayLow, vol: m.regularMarketVolume ?? 0,
                 ok: true, date: targetDate, src: "meta" };
      } catch (e) { continue; }
    }
    // Last resort (still Yahoo): daily candles lag for some symbols, but intraday bars
    // are fresher. Build daily closes from 15-min bars (last bar of each IST date).
    for (const host of ["query1", "query2"]) {
      try {
        const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=15m&range=5d&includePrePost=false`, { headers: HEADERS });
        if (!res.ok) continue;
        const cr = (await res.json())?.chart?.result?.[0];
        const ts = cr?.timestamp || [];
        const q  = cr?.indicators?.quote?.[0] || {};
        const days = new Map(); // date -> { close, high, low, vol }
        ts.forEach((tt, i) => {
          if (q.close?.[i] == null) return;
          const d = dateKey(tt);
          const cur = days.get(d) || { high: -Infinity, low: Infinity, vol: 0 };
          cur.close = q.close[i];
          cur.high = Math.max(cur.high, q.high?.[i] ?? q.close[i]);
          cur.low  = Math.min(cur.low,  q.low?.[i]  ?? q.close[i]);
          cur.vol += q.volume?.[i] || 0;
          days.set(d, cur);
        });
        const dates = [...days.keys()].sort();
        const i = dates.indexOf(targetDate);
        if (i < 1) continue;
        const today = days.get(targetDate), prev = days.get(dates[i - 1]).close;
        if (!today.close || !prev) continue;
        const chg = today.close - prev;
        return { sym, name, price: today.close, prev, chg, chgPct: (chg / prev) * 100,
                 high: today.high, low: today.low, vol: today.vol, ok: true, date: targetDate, src: "intraday" };
      } catch (e) { continue; }
    }
    return { sym, name, price: null, chg: null, chgPct: null, ok: false, stale: true, lastDate: staleInfo.lastDate };
  }

  return { sym, name, price: null, chg: null, chgPct: null, ok: false };
}

const netlifyHandler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Mode: live market -> normal candle fetch; after close -> last CMP (no candles).
  // Override for testing with ?mode=live or ?mode=close
  const qs = event.queryStringParameters || {};
  const live = qs.mode === "live" ? true : qs.mode === "close" ? false : isMarketOpen();

  // 1) index first -> defines the trading date every stock must match
  const idxMeta = { sym: "^NSEI", name: "Nifty 50" };
  let indexVal = live ? null : await fetchCmp(idxMeta, null);
  if (!indexVal) indexVal = await fetchOne(idxMeta, null).catch(() => null);
  const indexResult = { status: "fulfilled", value: indexVal };
  const targetDate = indexVal?.ok ? indexVal.date : null;

  // 2) all 50 stocks in parallel
  const stockResults = await Promise.allSettled(NIFTY50.map(async s => {
    if (!live) {
      const r = await fetchCmp(s, targetDate);
      if (r) return r;               // CMP matched the trading date
    }
    return fetchOne(s, targetDate);   // live, or CMP unavailable -> candle path + fallbacks
  }));

  const globalsPromise = Promise.allSettled(GLOBALS.map(fetchGlobal));

  const stocks = stockResults
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);

  const fetched = stocks.filter(s => s.ok).length;

  const niftyIndex = indexResult.status === "fulfilled" ? indexResult.value : null;
  const niftyLevel = Number.isFinite(niftyIndex?.price) && niftyIndex.price > 0
    ? niftyIndex.price
    : 24500;
  const impactBase = Number.isFinite(niftyIndex?.prev) && niftyIndex.prev > 0 ? niftyIndex.prev : niftyLevel;
  const staleSyms = stocks.filter(s => s.stale).map(s => `${s.sym}(last:${s.lastDate})`);
  const viaMeta = stocks.filter(s => s.src === 'meta' || s.src === 'intraday' || s.src === 'cmp').map(s => `${s.sym}(${s.src})`);
  const totalImpactWeight = Object.values(IMPACT_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const impactRows = stocks
    .filter(stock => stock.ok && stock.price != null && IMPACT_WEIGHTS[stock.sym] != null)
    .map(stock => {
      const weight = IMPACT_WEIGHTS[stock.sym];
      return {
        ...stock,
        weight,
        sector: IMPACT_SECTORS[stock.sym] || "Others",
        pts: impactBase * (weight / totalImpactWeight) * (stock.chgPct / 100),
      };
    });

  const globals = (await globalsPromise).map((r, i) => r.status === 'fulfilled' ? r.value : { ...GLOBALS[i], ok: false });

  if (fetched === 0) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "All Yahoo Finance requests failed", stocks: [] }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stocks, fetched, total: NIFTY50.length, niftyIndex, niftyLevel, mode: live ? "live" : "close", globals, targetDate, staleSyms, viaMeta, impactRows, ts: Date.now() }),
  };
};


// Vercel Node.js serverless adapter for the existing data handler.
module.exports = async function (req, res) {
  try {
    const result = await netlifyHandler({
      httpMethod: req.method,
      queryStringParameters: req.query || {},
    });
    const headers = result.headers || {};
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    res.status(result.statusCode || 200);
    if (result.body === undefined || result.body === null || result.body === '') return res.end();
    return res.send(result.body);
  } catch (error) {
    console.error('Nifty API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
