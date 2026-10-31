"""
Builds the search box's stock list from NSE's official equity list.

1. Download EQUITY_L.csv from NSE (nseindia.com → Market Data → Securities available for trading
   → "Equity segment"), and save it next to this script.
2. Run:  python scripts/build_stock_list.py scripts/EQUITY_L.csv
3. Commit public/data/nse-stocks.json — the search box picks it up on the next deploy.
"""
import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

SUFFIX = re.compile(r"\s*(limited|ltd\.?)\s*$", re.IGNORECASE)


def clean_name(name):
    name = SUFFIX.sub("", " ".join(name.split()))
    # NSE has some names in ALL CAPS — make them readable, but keep short words that are
    # probably acronyms (LTM, ONE, WAM, HDFC) in capitals
    if name.isupper():
        name = " ".join(w if len(w) <= 4 else w.capitalize() for w in name.split())
    return name


def main(src):
    rows = list(csv.DictReader(open(src, encoding="utf-8-sig")))
    rows = [{k.strip(): (v or "").strip() for k, v in r.items()} for r in rows]
    stocks = sorted(
        {(r["SYMBOL"], clean_name(r["NAME OF COMPANY"])) for r in rows if r.get("SYMBOL") and r.get("NAME OF COMPANY")}
    )
    out = Path(__file__).resolve().parent.parent / "public" / "data" / "nse-stocks.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "updated": date.today().isoformat(),
        "source": "NSE EQUITY_L.csv",
        "count": len(stocks),
        "stocks": [[s, n] for s, n in stocks],
    }, ensure_ascii=False, separators=(",", ":")))
    print(f"Wrote {len(stocks)} stocks to {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "EQUITY_L.csv")
