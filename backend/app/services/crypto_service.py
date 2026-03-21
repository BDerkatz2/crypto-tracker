import httpx
from app.config import settings
from app.cache import cache_manager
from typing import List, Dict, Optional
import asyncio

class CryptoAPIService:
    def __init__(self):
        self.base_url = settings.COINGECKO_API_URL
    
    async def get_crypto_data(self, crypto_ids: List[str]) -> List[Dict]:
        """
        Fetch cryptocurrency data from CoinGecko API
        Uses caching to reduce API calls
        """
        cache_key = f"crypto_data:{','.join(sorted(crypto_ids))}"
        
        # Check cache first
        cached_data = await cache_manager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "ids": ",".join(crypto_ids),
                    "vs_currencies": "usd",
                    "order": "market_cap_desc",
                    "per_page": 250,
                    "sparkline": False,
                    "market_cap_change_percentage": "24h"
                }
                
                response = await client.get(
                    f"{self.base_url}/coins/markets",
                    params=params,
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                # Cache the data
                await cache_manager.set(cache_key, data)
                return data
        except Exception as e:
            print(f"API Error: {e}")
            return []
    
    async def get_crypto_price_history(self, crypto_id: str, days: int = 7) -> Dict:
        """Fetch price history for a specific cryptocurrency"""
        cache_key = f"price_history:{crypto_id}:{days}"
        
        cached_data = await cache_manager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/coins/{crypto_id}/market_chart",
                    params={
                        "vs_currency": "usd",
                        "days": days
                    },
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                # Cache the data
                await cache_manager.set(cache_key, data, expiry=3600)  # 1 hour
                return data
        except Exception as e:
            print(f"API Error: {e}")
            return {}
    
    async def search_crypto(self, query: str) -> List[Dict]:
        """Search for cryptocurrencies"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={"query": query},
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                return data.get("coins", [])[:10]  # Return top 10 results
        except Exception as e:
            print(f"API Error: {e}")
            return []
    
    async def get_trending_cryptos(self) -> List[Dict]:
        """Get trending cryptocurrencies"""
        cache_key = "trending_cryptos"
        
        cached_data = await cache_manager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/trending",
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                # Process trending data
                trending = []
                for item in data.get("coins", [])[:10]:
                    trending.append({
                        "id": item["item"]["id"],
                        "name": item["item"]["name"],
                        "symbol": item["item"]["symbol"].upper(),
                        "market_cap_rank": item["item"].get("market_cap_rank", "N/A")
                    })
                
                # Cache for 30 minutes
                await cache_manager.set(cache_key, trending, expiry=1800)
                return trending
        except Exception as e:
            print(f"API Error: {e}")
            return []

crypto_service = CryptoAPIService()
