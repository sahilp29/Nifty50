"""
Financial history for the stock card — Python + yfinance (Yahoo blocks the JS handshake).
GET /api/financials?sym=TCS.NS

Returns:
  annual  — revenue and net profit for the last 4 financial years (FY23–FY26 style labels)
  ttmEps  — trailing 12-month EPS (sum of the last 4 quarters, else Yahoo's trailingEps)
  growth  — latest quarter vs the same quarter last year: revenue YoY, PAT YoY,
            and operating margin (op. profit ÷ revenue) — or NII YoY for banks/NBFCs.
            Falls back to Yahoo's own figures when the quarterly statements are too short.
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


def q_label(ts):
    m = ts.month
    q = 4 if m <= 3 else 1 if m <= 6 else 2 if m <= 9 else 3
    return f"Q{q} {fy_label(ts)}"


def yoy(s):
    """Latest quarter vs the same quarter one year earlier, in % (None if not available)"""
    if s.empty:
        return None
    cur_d, cur = s.index[-1], s.iloc[-1]
    prev = s[(s.index.year == cur_d.year - 1) & (s.index.month == cur_d.month)]
    if prev.empty or prev.iloc[-1] == 0:
        return None
    return (cur - prev.iloc[-1]) / abs(prev.iloc[-1]) * 100


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

    inc_q = t.quarterly_income_stmt
    ttm_eps = ttm(row(inc_q, "Diluted EPS", "Basic EPS"))

    # Quarterly growth & margin
    rev_q = row(inc_q, "Total Revenue", "Operating Revenue")
    pat_q = row(inc_q, "Net Income", "Net Income Common Stockholders")
    op_q = row(inc_q, "Operating Income")
    nii_q = row(inc_q, "Net Interest Income")
    bank_like = op_q.empty and row(inc_a, "Operating Income").empty and (not nii_q.empty or not row(inc_a, "Net Interest Income").empty)

    rev_yoy, pat_yoy = yoy(rev_q), yoy(pat_q)
    nii_yoy = yoy(nii_q) if bank_like else None
    op_margin = None
    if not bank_like and not op_q.empty and not rev_q.empty:
        d = op_q.index[-1]
        if d in rev_q.index and rev_q[d]:
            op_margin = op_q[d] / rev_q[d] * 100
    latest = max([s.index[-1] for s in (rev_q, pat_q) if not s.empty], default=None)

    # Fallbacks from Yahoo's own key statistics (needs the info call — only when something's missing)
    if ttm_eps is None or rev_yoy is None or pat_yoy is None or (op_margin is None and not bank_like):
        try:
            info = t.info or {}
        except Exception:
            info = {}
        if ttm_eps is None:
            ttm_eps = clean(info.get("trailingEps"))
        if rev_yoy is None and clean(info.get("revenueGrowth")) is not None:
            rev_yoy = info["revenueGrowth"] * 100
        if pat_yoy is None and clean(info.get("earningsQuarterlyGrowth")) is not None:
            pat_yoy = info["earningsQuarterlyGrowth"] * 100
        if op_margin is None and not bank_like and clean(info.get("operatingMargins")) is not None:
            op_margin = info["operatingMargins"] * 100

    growth = {
        "revenue": clean(rev_yoy), "pat": clean(pat_yoy),
        "opMargin": clean(op_margin), "nii": clean(nii_yoy),
        "quarter": q_label(latest) if latest is not None else None,
    }
    has_growth = any(v is not None for k, v in growth.items() if k != "quarter")
    return {"ok": bool(annual) or ttm_eps is not None or has_growth, "sym": sym, "annual": annual,
            "ttmEps": clean(ttm_eps), "bankLike": bool(bank_like), "growth": growth,
            "engine": "python-yfinance"}


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
