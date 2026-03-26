import httpx
import time
import re
from app.config import settings
from app.cache import cache_manager
from typing import List, Dict, Optional
import asyncio

COINCAP_BASE = "https://api.coincap.io/v2"


async def _resolve_coincap_id(client: httpx.AsyncClient, coin_id: str) -> str | None:
    """
    Return the CoinCap asset ID that corresponds to `coin_id`.
    Tries a direct lookup first; if that 404s it falls back to a text search.
    Returns None when no match can be found.
    """
    try:
        normalized_id = (coin_id or "").strip().lower()
        # CoinGecko often appends numeric suffixes (e.g. "siren-2") where CoinCap uses "siren".
        base_id = re.sub(r"-\d+$", "", normalized_id)

        # 1) Try direct lookups with both full and de-suffixed IDs.
        direct_candidates = [normalized_id]
        if base_id and base_id != normalized_id:
            direct_candidates.append(base_id)

        for candidate in direct_candidates:
            r = await client.get(f"{COINCAP_BASE}/assets/{candidate}", timeout=10)
            if r.status_code == 200:
                data = r.json().get("data") or {}
                if data.get("id"):
                    return data["id"]

        # 2) Search using multiple queries and rank results.
        query_candidates = [normalized_id.replace("-", " ")]
        if base_id and base_id != normalized_id:
            query_candidates.append(base_id.replace("-", " "))
        # Deduplicate while keeping order.
        seen = set()
        query_candidates = [q for q in query_candidates if not (q in seen or seen.add(q))]

        best_match_id = None
        best_score = -1
        for search_q in query_candidates:
            rs = await client.get(
                f"{COINCAP_BASE}/assets",
                params={"search": search_q, "limit": 10},
                timeout=10,
            )
            if rs.status_code != 200:
                continue
            assets = rs.json().get("data", [])
            for asset in assets:
                asset_id = (asset.get("id") or "").lower()
                asset_name = (asset.get("name") or "").lower()
                score = 0
                if asset_id == normalized_id:
                    score = 100
                elif asset_id == base_id:
                    score = 95
                elif asset_name == normalized_id.replace("-", " "):
                    score = 90
                elif asset_name == base_id.replace("-", " "):
                    score = 85
                elif base_id and base_id in asset_id:
                    score = 70
                elif normalized_id and normalized_id in asset_id:
                    score = 60
                if score > best_score and asset_id:
                    best_score = score
                    best_match_id = asset_id

        if best_match_id:
            return best_match_id
    except Exception as e:
        print(f"CoinCap ID resolution failed for {coin_id}: {e}")
    return None


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
                    # Also cache each coin individually so single-ID Dashboard calls hit cache
                    for coin in data:
                        if coin.get("id"):
                            single_key = f"crypto_data:{coin['id']}"
                            await cache_manager.set(single_key, [coin])
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
                        # Resolve the actual CoinCap ID (may differ from CoinGecko ID)
                        coincap_id = await _resolve_coincap_id(client, coin_id)
                        if not coincap_id:
                            print(f"CoinCap: no asset found for {coin_id}, skipping")
                            continue
                        # If ID changed, refetch the full asset record
                        if coincap_id != coin_id:
                            r2 = await client.get(f"{COINCAP_BASE}/assets/{coincap_id}", timeout=10)
                            r2.raise_for_status()
                            a = r2.json().get("data") or {}
                        else:
                            r = await client.get(f"{COINCAP_BASE}/assets/{coin_id}", timeout=10)
                            r.raise_for_status()
                            a = r.json().get("data") or {}
                        if a.get("id"):
                            normalized.append({
                                # Keep the original CoinGecko ID so the frontend stays consistent
                                "id": coin_id,
                                "symbol": (a.get("symbol") or "").upper(),
                                "name": a.get("name", ""),
                                "current_price": float(a.get("priceUsd") or 0),
                                "market_cap": float(a.get("marketCapUsd") or 0),
                                "price_change_percentage_24h": float(a.get("changePercent24Hr") or 0),
                                "circulating_supply": float(a.get("supply") or 0),
                                # Store CoinCap ID for history lookups
                                "_coincap_id": a["id"],
                            })
                    except Exception as inner_e:
                        print(f"CoinCap individual fetch failed for {coin_id}: {inner_e}")
                if normalized:
                    await cache_manager.set(cache_key, normalized)
                    # Also cache each coin individually so Dashboard hits the cache
                    for coin in normalized:
                        single_key = f"crypto_data:{coin['id']}"
                        await cache_manager.set(single_key, [coin])
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
                # Resolve the CoinCap ID (CoinGecko IDs often differ)
                coincap_id = await _resolve_coincap_id(client, crypto_id)
                if not coincap_id:
                    print(f"CoinCap: cannot resolve id for {crypto_id}, returning empty history")
                    return {}
                response = await client.get(
                    f"{COINCAP_BASE}/assets/{coincap_id}/history",
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
