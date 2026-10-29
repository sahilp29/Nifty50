"""
Financial history for the stock card — Python + yfinance (Yahoo blocks the JS handshake).
GET /api/financials?sym=TCS.NS

Returns:
  annual  — revenue and net profit for the last 4 financial years (FY23–FY26 style labels)
  ttmEps  — trailing 12-month EPS (sum of the last 4 quarters, else Yahoo's trailingEps)
The stock card uses these to fill the bar charts and the TTM PE. Cached 12 hours.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import math
import re

import pandas as pd
import yfinance as yf

try:
    yf.set_tz_cache_location("/tmp/yf-cache")   # Vercel: only /tmp is writable
except Exception:
    pass


def fy_label(ts):
    """Indian financial year: Mar-2026 → FY26, Sep-2026 → FY27"""
    y = ts.year if ts.month <= 3 else ts.year + 1
    return f"FY{str(y)[2:]}"


def clean(v):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def row(df, *names):
    """First matching statement row as an ascending, NaN-free Series indexed by date"""
    if df is None or getattr(df, "empty", True):
        return pd.Series(dtype=float)
    for name in names:
        if name in df.index:
            s = pd.to_numeric(df.loc[name], errors="coerce").dropna()
            s.index = pd.to_datetime(s.index)
            return s.sort_index()
    return pd.Series(dtype=float)


def ttm(s):
    """Sum of the last 4 consecutive quarters, or None if there's a gap"""
    if len(s) < 4:
        return None
    idx = s.index[-4:]
    for a, b in zip(idx[:-1], idx[1:]):
        if (b.year - a.year) * 12 + (b.month - a.month) != 3:
            return None
    return float(s.iloc[-4:].sum())


def financials(sym):
    t = yf.Ticker(sym)
    inc_a = t.income_stmt
    rev = row(inc_a, "Total Revenue", "Operating Revenue")
    pat = row(inc_a, "Net Income", "Net Income Common Stockholders")
    dates = sorted(set(rev.index) | set(pat.index))[-4:]
    annual = [{
        "fy": fy_label(d), "date": d.strftime("%Y-%m-%d"),
        "revenue": clean(rev.get(d)), "netIncome": clean(pat.get(d)),
    } for d in dates]

    ttm_eps = ttm(row(t.quarterly_income_stmt, "Diluted EPS", "Basic EPS"))
    if ttm_eps is None:
        try:
            ttm_eps = clean((t.info or {}).get("trailingEps"))
        except Exception:
            ttm_eps = None

    return {"ok": bool(annual) or ttm_eps is not None, "sym": sym, "annual": annual,
            "ttmEps": clean(ttm_eps), "engine": "python-yfinance"}


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
        sym = parse_qs(urlparse(self.path).query).get("sym", [""])[0].strip().upper()
        if not re.fullmatch(r"[A-Z0-9&\-]{1,25}\.(NS|BO)", sym):
            return self._send(400, {"ok": False, "error": "Use ?sym=TCS.NS"}, "public, s-maxage=300")
        try:
            data = financials(sym)
        except Exception as e:
            return self._send(502, {"ok": False, "error": f"yfinance failed: {type(e).__name__}: {e}"}, "public, s-maxage=120")
        if not data["ok"]:
            return self._send(404, {"ok": False, "error": f"No financials for {sym}"}, "public, s-maxage=600")
        return self._send(200, data, "public, s-maxage=43200, stale-while-revalidate=86400")
