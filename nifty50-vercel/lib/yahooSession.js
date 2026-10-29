// Shared Yahoo Finance helpers for the server functions.
// Some Yahoo endpoints (quoteSummary, earnings calendar) need a cookie + "crumb"
// handshake — the same thing the yfinance library does. The session is reused while warm.

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

let session = null; // { cookie, crumb }

async function getSession() {
  if (session) return session;
  const r1 = await fetch("https://fc.yahoo.com", { headers: HEADERS, redirect: "manual" }).catch(() => null);
  const raw = r1?.headers?.get("set-cookie") || "";
  const cookie = raw.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
  if (!cookie) return null;
  for (const host of ["query2", "query1"]) {
    const r2 = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, { headers: { ...HEADERS, Cookie: cookie } }).catch(() => null);
    const crumb = r2 && r2.ok ? (await r2.text()).trim() : "";
    if (crumb && !crumb.includes("<")) { session = { cookie, crumb }; return session; }
  }
  return null;
}

/** Plain GET on query1/query2 (no crumb needed): chart, fundamentals time-series */
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

/** quoteSummary modules for one symbol (needs the crumb) */
async function quoteSummary(sym, modules) {
  const s = await getSession();
  if (!s) return null;
  for (const host of ["query2", "query1"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}&crumb=${encodeURIComponent(s.crumb)}`, { headers: { ...HEADERS, Cookie: s.cookie } });
      if (res.status === 401 || res.status === 403) { session = null; return null; }
      if (!res.ok) continue;
      return (await res.json())?.quoteSummary?.result?.[0] || null;
    } catch (e) { continue; }
  }
  return null;
}

/** Past + upcoming earnings (results) dates with times, newest first. Best effort. */
async function earningsDates(sym, size = 8) {
  const s = await getSession();
  if (!s) return [];
  const body = {
    size,
    query: { operator: "and", operands: [{ operator: "eq", operands: ["ticker", sym] }] },
    sortField: "startdatetime", sortType: "DESC", entityIdType: "earnings",
    includeFields: ["startdatetime", "timeZoneShortName", "epsestimate", "epsactual"],
  };
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/visualization?lang=en-US&region=US&crumb=${encodeURIComponent(s.crumb)}`, {
      method: "POST", headers: { ...HEADERS, Cookie: s.cookie, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const doc = (await res.json())?.finance?.result?.[0]?.documents?.[0];
    const cols = (doc?.columns || []).map((c) => c.id || c.label || c);
    const i = cols.indexOf("startdatetime");
    if (i < 0) return [];
    return (doc.rows || []).map((r) => r[i]).filter(Boolean).map((d) => new Date(d)).filter((d) => !isNaN(d));
  } catch (e) { return []; }
}

const rawNum = (x) => (x && typeof x === "object" ? x.raw : x);

// IST helpers
const IST = 19800;
const istDate = (unixSec) => new Date((unixSec + IST) * 1000).toISOString().slice(0, 10);
const istMinutes = (unixSec) => { const d = new Date((unixSec + IST) * 1000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const todayIST = () => istDate(Math.floor(Date.now() / 1000));

module.exports = { HEADERS, getSession, getJSON, quoteSummary, earningsDates, rawNum, IST, istDate, istMinutes, todayIST };
