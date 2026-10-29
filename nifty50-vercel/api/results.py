"""
Result (earnings) dates — Python + yfinance, because Yahoo refuses the plain-JavaScript
cookie/crumb handshake from Vercel's servers, and yfinance is built to get past it.

GET /api/results?sym=TRENT.NS   → next / last result date + the price move on the result day
GET /api/results?set=nifty50    → today's R badges for the Nifty 50 (+ every stock's dates)

Times are converted to IST. Results after 3:30 PM IST count for the next trading day
(that's when the market reacts). Cached on Vercel's CDN for 1 hour.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import math
import re

import pandas as pd
import yfinance as yf

try:
    yf.set_tz_cache_location("/tmp/yf-cache")   # Vercel: only /tmp is writable
except Exception:
    pass

IST = timezone(timedelta(hours=5, minutes=30))

# Nifty 50 symbols (same list as lib/indexData.js — keep in sync after NSE rebalancing)
NIFTY50 = ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS","BAJFINANCE.NS","BAJAJFINSV.NS","SHRIRAMFIN.NS","SBILIFE.NS","HDFCLIFE.NS","JIOFIN.NS","BSE.NS","TCS.NS","INFY.NS","HCLTECH.NS","TECHM.NS","RELIANCE.NS","ONGC.NS","COALINDIA.NS","NTPC.NS","POWERGRID.NS","BHARTIARTL.NS","MARUTI.NS","M&M.NS","TMPV.NS","BAJAJ-AUTO.NS","EICHERMOT.NS","INDIGO.NS","HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","TATACONSUM.NS","TRENT.NS","ETERNAL.NS","SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","APOLLOHOSP.NS","MAXHEALTH.NS","LT.NS","ULTRACEMCO.NS","GRASIM.NS","JSWSTEEL.NS","TATASTEEL.NS","HINDALCO.NS","BEL.NS","ASIANPAINT.NS","TITAN.NS","ADANIENT.NS","ADANIPORTS.NS"]


def today_ist():
    return datetime.now(IST).date()


def earnings_times(sym):
    """All known result dates/times for a stock as IST datetimes (past and upcoming)."""
    t = yf.Ticker(sym)
    out = []
    try:
        df = t.get_earnings_dates(limit=12)
        if df is not None and not df.empty:
            for ts in df.index:
                ts = pd.Timestamp(ts)
                ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts
                out.append(ts.tz_convert(IST).to_pydatetime())
    except Exception:
        pass
    if not out:  # fallback: the calendar (dates only, no time)
        try:
            cal = t.calendar or {}
            for d in cal.get("Earnings Date", []) or []:
                out.append(datetime(d.year, d.month, d.day, 0, 0, tzinfo=IST))
        except Exception:
            pass
    return t, sorted(set(out))


def after_hours(dt):
    return dt.hour * 60 + dt.minute >= 15 * 60 + 30


def stock_results(sym):
    t, times = earnings_times(sym)
    today = today_ist()
    by_day = {}
    for dt in times:
        by_day[dt.date()] = max(dt, by_day.get(dt.date(), dt))
    days = sorted(by_day)
    nxt = next((d for d in days if d >= today), None)
    last = next((d for d in reversed(days) if d < today), None)

    move, reaction = None, None
    if last:
        try:
            h = t.history(period="6mo", interval="1d", auto_adjust=False)
            closes = h["Close"].dropna()
            closes.index = [pd.Timestamp(i).tz_convert(IST).date() if pd.Timestamp(i).tzinfo else pd.Timestamp(i).date() for i in closes.index]
            tdays = sorted(set(closes.index))
            ah = after_hours(by_day[last])
            idx = next((i for i, d in enumerate(tdays) if (d > last if ah else d >= last)), None)
            if idx:
                reaction = tdays[idx]
                move = (float(closes[tdays[idx]]) / float(closes[tdays[idx - 1]]) - 1) * 100
                if not math.isfinite(move):
                    move = None
        except Exception:
            pass

    return {
        "ok": True, "sym": sym,
        "next": nxt.isoformat() if nxt else None,
        "nextIsToday": nxt == today,
        "nextEstimate": None,
        "last": last.isoformat() if last else None,
        "lastAfterHours": after_hours(by_day[last]) if last else None,
        "reactionDay": reaction.isoformat() if reaction else None,
        "lastMove": move,
        "dates": [d.isoformat() for d in days],
        "engine": "python-yfinance",
    }


def prev_weekday(d):
    d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


def nifty_badges():
    today = today_ist()
    yesterday = prev_weekday(today)

    def one(sym):
        try:
            _, times = earnings_times(sym)
        except Exception:
            times = []
        badges = []
        for dt in times:
            if dt.date() == today:
                badges.append({"t": "R", "note": "Results today" + (" after market hours" if after_hours(dt) else "")})
            elif dt.date() == yesterday and after_hours(dt):
                badges.append({"t": "R", "note": "Results announced after market yesterday"})
        return sym, badges[:1], sorted({dt.date().isoformat() for dt in times})

    with ThreadPoolExecutor(max_workers=10) as pool:
        rows = list(pool.map(one, NIFTY50))
    return {
        "ok": True, "today": today.isoformat(),
        "badges": {s: b for s, b, _ in rows if b},
        "dates": {s: d for s, _, d in rows},
        "withDates": sum(1 for _, _, d in rows if d),
        "engine": "python-yfinance",
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, status, obj, cache):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        try:
            if qs.get("set", [""])[0] == "nifty50":
                return self._send(200, nifty_badges(), "public, s-maxage=3600, stale-while-revalidate=7200")
            sym = qs.get("sym", [""])[0].strip().upper()
            if not re.fullmatch(r"[A-Z0-9&\-]{1,25}\.(NS|BO)", sym):
                return self._send(400, {"ok": False, "error": "Use ?sym=TCS.NS or ?set=nifty50"}, "public, s-maxage=300")
            return self._send(200, stock_results(sym), "public, s-maxage=3600, stale-while-revalidate=7200")
        except Exception as e:
            return self._send(502, {"ok": False, "error": f"yfinance failed: {type(e).__name__}: {e}"}, "public, s-maxage=120")
