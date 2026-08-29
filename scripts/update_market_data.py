#!/usr/bin/env python3
"""Refresh the public market snapshot used by MSIZ Terminal."""

from __future__ import annotations

import json
import csv
import io
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


SYMBOLS = {
    "SCHD": "SCHD",
    "QQQM": "QQQM",
    "SGOV": "SGOV",
    "SMH": "SMH",
    "IBIT": "IBIT",
    "^GSPC": "^GSPC",
    "^DJI": "^DJI",
    "^IXIC": "^IXIC",
    "ES=F": "ES=F",
    "YM=F": "YM=F",
    "NQ=F": "NQ=F",
    "BTC=F": "BTC=F",
    "DX-Y.NYB": "DX-Y.NYB",
    "GC=F": "GC=F",
    "CL=F": "CL=F",
    "BTC-USD": "BTC-USD",
    "EURUSD=X": "EURUSD=X",
    "JPY=X": "JPY=X",
    "^VIX": "^VIX",
    "HG=F": "HG=F",
}

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "market-quotes.json"


def fetch_quote(symbol: str) -> dict:
    encoded = urllib.parse.quote(symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?interval=1d&range=5d"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MSIZ-Terminal-Updater/1.0)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)

    result = payload["chart"]["result"][0]
    meta = result.get("meta", {})
    quote_rows = result.get("indicators", {}).get("quote", [{}])[0]
    closes = [value for value in quote_rows.get("close", []) if value is not None]
    volumes = [value for value in quote_rows.get("volume", []) if value is not None]
    price = meta.get("regularMarketPrice") or (closes[-1] if closes else None)
    # With a multi-day range, Yahoo's chartPreviousClose can refer to the close
    # before the whole range. A one-day intraday request returns the immediately
    # preceding close used on Yahoo Finance's own quote cards.
    prior_url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        "?interval=1h&range=1d"
    )
    prior_request = urllib.request.Request(
        prior_url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MSIZ-Terminal-Updater/1.0)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(prior_request, timeout=20) as response:
        prior_payload = json.load(response)
    prior_meta = prior_payload["chart"]["result"][0].get("meta", {})
    previous = prior_meta.get("previousClose") or prior_meta.get("chartPreviousClose")
    if previous is None:
        previous = closes[-1] if closes else meta.get("chartPreviousClose")
    if price is None:
        raise ValueError(f"No price returned for {symbol}")

    change = price - previous if previous else 0
    percent = (change / previous * 100) if previous else 0
    return {
        "price": round(float(price), 4),
        "prev": round(float(previous), 4) if previous else round(float(price), 4),
        "change": round(float(change), 4),
        "changesPercentage": round(float(percent), 4),
        "volume": int(volumes[-1]) if volumes else 0,
        "avgVolume": int(sum(volumes) / len(volumes)) if volumes else 0,
        "yearHigh": meta.get("fiftyTwoWeekHigh"),
        "yearLow": meta.get("fiftyTwoWeekLow"),
        "marketState": meta.get("marketState", ""),
        "currency": meta.get("currency", "USD"),
    }


def fetch_news() -> list[str]:
    query = urllib.parse.quote("stock market economy Federal Reserve investing when:1d")
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())
    headlines: list[str] = []
    seen: set[str] = set()
    for item in root.findall("./channel/item"):
        title = " ".join((item.findtext("title") or "").replace("\ufffd", "'").split())
        if not title or title.lower() in seen:
            continue
        seen.add(title.lower())
        headlines.append(title)
        if len(headlines) == 12:
            break
    if not headlines:
        raise ValueError("No current news headlines were returned")
    return headlines


def fetch_fred_series(series_id: str) -> list[tuple[str, float]]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={urllib.parse.quote(series_id)}"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        text = response.read().decode("utf-8-sig")
    rows: list[tuple[str, float]] = []
    for row in csv.DictReader(io.StringIO(text)):
        raw = row.get(series_id, ".")
        if raw not in (None, "", "."):
            rows.append((row["observation_date"], float(raw)))
    if not rows:
        raise ValueError(f"No FRED observations returned for {series_id}")
    return rows


def percent_change(current: float, previous: float) -> float:
    return (current / previous - 1) * 100 if previous else 0


def build_economy() -> list[str]:
    cpi = fetch_fred_series("CPIAUCSL")
    core_pce = fetch_fred_series("PCEPILFE")
    unemployment = fetch_fred_series("UNRATE")
    fed_funds = fetch_fred_series("FEDFUNDS")
    gdp = fetch_fred_series("A191RL1Q225SBEA")
    two_year = fetch_fred_series("DGS2")
    cpi_yoy = percent_change(cpi[-1][1], cpi[-13][1])
    pce_yoy = percent_change(core_pce[-1][1], core_pce[-13][1])
    return [
        f"CPI {cpi[-1][0][:7]} | {cpi_yoy:.1f}% YoY",
        f"Core PCE {core_pce[-1][0][:7]} | {pce_yoy:.1f}% YoY",
        f"Unemployment {unemployment[-1][0][:7]} | {unemployment[-1][1]:.1f}%",
        f"Fed Funds {fed_funds[-1][0][:7]} | {fed_funds[-1][1]:.2f}%",
        f"Real GDP {gdp[-1][0]} | {gdp[-1][1]:.1f}% annualized",
        f"2-Year Treasury {two_year[-1][0]} | {two_year[-1][1]:.2f}%",
    ]


def build_macro(quotes: dict[str, dict]) -> list[str]:
    labels = {
        "DX-Y.NYB": ("DXY", "", 2),
        "GC=F": ("Gold", "$", 2),
        "CL=F": ("WTI", "$", 2),
        "BTC-USD": ("Bitcoin", "$", 0),
        "EURUSD=X": ("EUR/USD", "", 4),
        "JPY=X": ("USD/JPY", "", 2),
        "^VIX": ("VIX", "", 2),
        "HG=F": ("Copper", "$", 3),
    }
    items: list[str] = []
    for symbol, (label, prefix, decimals) in labels.items():
        quote = quotes.get(symbol)
        if not quote:
            continue
        arrow = "▲" if quote["changesPercentage"] >= 0 else "▼"
        price = f"{quote['price']:,.{decimals}f}"
        items.append(f"{label}  {prefix}{price} {arrow}{abs(quote['changesPercentage']):.2f}%")
    return items


def main() -> None:
    previous: dict = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}
    quotes: dict[str, dict] = {}
    errors: dict[str, str] = {}
    for display, source in SYMBOLS.items():
        try:
            quotes[display] = fetch_quote(source)
        except Exception as exc:  # Keep a partial snapshot useful if one ticker fails.
            errors[display] = str(exc)
        time.sleep(0.25)

    etfs = ["SCHD", "QQQM", "SGOV", "SMH", "IBIT"]
    gainers = sorted(
        (
            {
                "sym": symbol,
                "name": symbol,
                "price": quotes[symbol]["price"],
                "chg": quotes[symbol]["changesPercentage"],
            }
            for symbol in etfs
            if symbol in quotes
        ),
        key=lambda item: item["chg"],
        reverse=True,
    )
    try:
        news = fetch_news()
    except Exception as exc:
        errors["news"] = str(exc)
        news = previous.get("news", [])
    try:
        economy = build_economy()
    except Exception as exc:
        errors["economy"] = str(exc)
        economy = previous.get("economy", [])
    macro = build_macro(quotes) or previous.get("macro", [])
    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Yahoo Finance public chart data",
        "quotes": {key: value for key, value in quotes.items() if key not in {"ES=F", "YM=F", "NQ=F", "BTC=F"}},
        "futures": {key: quotes[key] for key in ("ES=F", "YM=F", "NQ=F", "BTC=F") if key in quotes},
        "gainers": gainers,
        "news": news,
        "economy": economy,
        "macro": macro,
        "errors": errors,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    if len(quotes) < 8:
        raise RuntimeError(f"Too few quotes were refreshed: {len(quotes)}; errors={errors}")


if __name__ == "__main__":
    main()
