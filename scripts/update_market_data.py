#!/usr/bin/env python3
"""Refresh the public market snapshot used by MSIZ Terminal."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
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
    previous = meta.get("chartPreviousClose") or meta.get("previousClose")
    if previous is None and len(closes) > 1:
        previous = closes[-2]
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


def main() -> None:
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
    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Yahoo Finance public chart data",
        "quotes": {key: value for key, value in quotes.items() if key not in {"ES=F", "YM=F", "NQ=F"}},
        "futures": {key: quotes[key] for key in ("ES=F", "YM=F", "NQ=F") if key in quotes},
        "gainers": gainers,
        "errors": errors,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    if len(quotes) < 8:
        raise RuntimeError(f"Too few quotes were refreshed: {len(quotes)}; errors={errors}")


if __name__ == "__main__":
    main()
