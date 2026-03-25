import httpx
import time
from app.config import settings
from app.cache import cache_manager
from typing import List, Dict, Optional
import asyncio

COINCAP_BASE = "https://api.coincap.io/v2"


class CryptoAPIService:
    def __init__(self):
        self.base_url = settings.COINGECKO_API_URL

    def _get_headers(self) -> dict:
        headers = {"accept": "application/json"}
        if settings.COINGECKO_API_KEY:
            headers["x-cg-demo-api-key"] = settings.COINGECKO_API_KEY
        return headers

    # ------------------------------------------------------------------ #
    #  get_crypto_data: CoinGecko → CoinCap fallback                       #
    # ------------------------------------------------------------------ #
    async def get_crypto_data(self, crypto_ids: List[str]) -> List[Dict]:
        cache_key = f"crypto_data:{','.join(sorted(crypto_ids))}"
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached

        # 1. Try CoinGecko
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/coins/markets",
                    params={
                        "ids": ",".join(crypto_ids),
                        "vs_currency": "usd",
                        "order": "market_cap_desc",
                        "per_page": 250,
                        "sparkline": False,
                        "price_change_percentage": "24h",
                    },
                    headers=self._get_headers(),
                    timeout=10,
                )
                print(f"CoinGecko /coins/markets status: {response.status_code}")
                response.raise_for_status()
                data = response.json()
                if data:
                    await cache_manager.set(cache_key, data)
                    return data
                print("CoinGecko returned empty data, falling back to CoinCap")
        except Exception as e:
            print(f"CoinGecko error (get_crypto_data): {e} – falling back to CoinCap")

        # 2. Fall back to CoinCap — fetch each asset individually for reliability
        try:
            async with httpx.AsyncClient() as client:
                normalized = []
                for coin_id in crypto_ids:
                    try:
                        r = await client.get(
                            f"{COINCAP_BASE}/assets/{coin_id}",
                            timeout=10,
                        )
                        r.raise_for_status()
                        a = r.json().get("data") or {}
                        if a.get("id"):
                            normalized.append({
                                "id": a["id"],
                                "symbol": (a.get("symbol") or "").upper(),
                                "name": a.get("name", ""),
                                "current_price": float(a.get("priceUsd") or 0),
                                "market_cap": float(a.get("marketCapUsd") or 0),
                                "price_change_percentage_24h": float(a.get("changePercent24Hr") or 0),
                                "circulating_supply": float(a.get("supply") or 0),
                            })
                    except Exception as inner_e:
                        print(f"CoinCap individual fetch failed for {coin_id}: {inner_e}")
                if normalized:
                    await cache_manager.set(cache_key, normalized)
                return normalized
        except Exception as e:
            print(f"CoinCap error (get_crypto_data): {e}")
            return []

    # ------------------------------------------------------------------ #
    #  get_crypto_price_history: CoinGecko → CoinCap fallback              #
    # ------------------------------------------------------------------ #
    async def get_crypto_price_history(self, crypto_id: str, days: int = 7) -> Dict:
        cache_key = f"price_history:{crypto_id}:{days}"
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached

        # 1. Try CoinGecko
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/coins/{crypto_id}/market_chart",
                    params={"vs_currency": "usd", "days": days},
                    headers=self._get_headers(),
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                if data.get("prices"):
                    await cache_manager.set(cache_key, data, expiry=3600)
                    return data
                print("CoinGecko returned empty history, falling back to CoinCap")
        except Exception as e:
            print(f"CoinGecko error (get_crypto_price_history): {e} – falling back to CoinCap")

        # 2. Fall back to CoinCap
        try:
            end_ms = int(time.time() * 1000)
            start_ms = end_ms - days * 86400 * 1000
            # CoinCap interval: m1/m5/m15/m30/h1/h2/h6/h12/d1
            if days <= 1:
                interval = "m30"
            elif days <= 7:
                interval = "h1"
            elif days <= 90:
                interval = "h6"
            else:
                interval = "d1"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{COINCAP_BASE}/assets/{crypto_id}/history",
                    params={"interval": interval, "start": start_ms, "end": end_ms},
                    timeout=10,
                )
                response.raise_for_status()
                raw = response.json().get("data", [])
                # Normalise to CoinGecko format: {"prices": [[timestamp, price], ...]}
                prices = [
                    [int(item["time"]), float(item["priceUsd"])]
                    for item in raw
                    if item.get("priceUsd") is not None
                ]
                data = {"prices": prices}
                if prices:
                    await cache_manager.set(cache_key, data, expiry=3600)
                return data
        except Exception as e:
            print(f"CoinCap error (get_crypto_price_history): {e}")
            return {}

    # ------------------------------------------------------------------ #
    #  search_crypto: CoinGecko → CoinCap fallback                         #
    # ------------------------------------------------------------------ #
    async def search_crypto(self, query: str) -> List[Dict]:
        # 1. Try CoinGecko
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={"query": query},
                    headers=self._get_headers(),
                    timeout=10,
                )
                response.raise_for_status()
                coins = response.json().get("coins", [])
                if coins:
                    return coins[:10]
        except Exception as e:
            print(f"CoinGecko error (search_crypto): {e} – falling back to CoinCap")

        # 2. Fall back to CoinCap
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{COINCAP_BASE}/assets",
                    params={"search": query, "limit": 10},
                    timeout=10,
                )
                response.raise_for_status()
                assets = response.json().get("data", [])
                return [
                    {"id": a["id"], "name": a["name"], "symbol": (a.get("symbol") or "").upper()}
                    for a in assets
                ]
        except Exception as e:
            print(f"CoinCap error (search_crypto): {e}")
            return []

    # ------------------------------------------------------------------ #
    #  get_trending_cryptos: CoinGecko → CoinCap top-10 by rank fallback   #
    # ------------------------------------------------------------------ #
    async def get_trending_cryptos(self) -> List[Dict]:
        cache_key = "trending_cryptos"
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached

        # 1. Try CoinGecko
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/trending",
                    headers=self._get_headers(),
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                trending = [
                    {
                        "id": item["item"]["id"],
                        "name": item["item"]["name"],
                        "symbol": item["item"]["symbol"].upper(),
                        "market_cap_rank": item["item"].get("market_cap_rank", "N/A"),
                    }
                    for item in data.get("coins", [])[:10]
                ]
                if trending:
                    await cache_manager.set(cache_key, trending, expiry=1800)
                    return trending
        except Exception as e:
            print(f"CoinGecko error (get_trending_cryptos): {e} – falling back to CoinCap")

        # 2. Fall back to CoinCap top 10 by rank
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{COINCAP_BASE}/assets",
                    params={"limit": 10},
                    timeout=10,
                )
                response.raise_for_status()
                assets = response.json().get("data", [])
                trending = [
                    {
                        "id": a["id"],
                        "name": a["name"],
                        "symbol": a["symbol"].upper(),
                        "market_cap_rank": int(a.get("rank", 0)),
                    }
                    for a in assets
                ]
                await cache_manager.set(cache_key, trending, expiry=1800)
                return trending
        except Exception as e:
            print(f"CoinCap error (get_trending_cryptos): {e}")
            return []


crypto_service = CryptoAPIService()
