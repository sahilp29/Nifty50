// Today's corporate events for the Nifty 50: /api/events
//   R = results today (or results announced after 3:30 PM on the previous trading day,
//       since the market reacts the next morning)
//   D = ex-dividend today (with the amount when Yahoo has it)
//   S = split or bonus ex-date today (Yahoo records a bonus as a split, e.g. 1:1 bonus = 2:1)
// Sources: Yahoo quoteSummary calendarEvents (results & ex-dividend dates) and chart events
// (dividends & splits that have gone ex). Cached 30 min on the CDN.
const Y = require("../yahooSession.js");
const { CONSTITUENTS } = require("../indexData.js");

/** Previous weekday's IST date (good enough for "results after market yesterday") */
function prevWeekday(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  do { d.setUTCDate(d.getUTCDate() - 1); } while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}

async function eventsFor([code, name], today, yesterday) {
  const sym = `${code}.NS`;
  const [qs, ch] = await Promise.all([
    Y.quoteSummary(sym, "calendarEvents,defaultKeyStatistics").catch(() => null),
    Y.getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d&events=div%7Csplit`).catch(() => null),
  ]);
  const badges = [];
  const cal = qs?.calendarEvents;

  // R — results
  for (const t of (cal?.earnings?.earningsDate || []).map(Y.rawNum).filter(Boolean)) {
    const d = Y.istDate(t), late = Y.istMinutes(t) >= 930;
    const est = cal?.earnings?.isEarningsDateEstimate ? " (date estimated by Yahoo)" : "";
    if (d === today) badges.push({ t: "R", note: `Results today${late ? " after market hours" : ""}${est}` });
    else if (d === yesterday && late) badges.push({ t: "R", note: `Results announced after market yesterday${est}` });
  }

  // D and S — from chart events (already ex), then calendarEvents for an ex-dividend date today
  const ev = ch?.chart?.result?.[0]?.events || {};
  for (const dv of Object.values(ev.dividends || {})) {
    if (Y.istDate(dv.date) === today) badges.push({ t: "D", note: `Ex-dividend today: ₹${(+dv.amount).toFixed(2)} per share`, amount: +dv.amount });
  }
  if (!badges.some((b) => b.t === "D") && Y.rawNum(cal?.exDividendDate) && Y.istDate(Y.rawNum(cal.exDividendDate)) === today) {
    const amt = Y.rawNum(qs?.defaultKeyStatistics?.lastDividendValue);
    badges.push({ t: "D", note: `Ex-dividend today${amt ? `: ₹${(+amt).toFixed(2)} per share` : ""}`, amount: amt ? +amt : null });
  }
  for (const sp of Object.values(ev.splits || {})) {
    if (Y.istDate(sp.date) === today) {
      const ratio = sp.splitRatio || `${sp.numerator}:${sp.denominator}`;
      badges.push({ t: "S", note: `Split / bonus ex-date today (${ratio}) — price adjusted, not a real fall` });
    }
  }
  const meta = ch?.chart?.result?.[0]?.meta;
  return { sym, name, badges, price: meta?.regularMarketPrice ?? null };
}

exports.handler = async function () {
  const today = Y.todayIST(), yesterday = prevWeekday(today);
  const rows = await Promise.all((CONSTITUENTS.nifty50 || []).map((s) => eventsFor(s, today, yesterday).catch(() => null)));
  const badges = {};
  for (const r of rows) {
    if (!r || !r.badges.length) continue;
    // add the dividend's rough price effect to the note
    for (const b of r.badges) if (b.t === "D" && b.amount && r.price) b.note += ` · ≈ −${((b.amount / r.price) * 100).toFixed(2)}% of price`;
    badges[r.sym] = r.badges.map(({ t, note }) => ({ t, note }));
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
    body: JSON.stringify({ ok: true, today, checked: rows.filter(Boolean).length, badges, crumb: !!(await Y.getSession()) }),
  };
};
