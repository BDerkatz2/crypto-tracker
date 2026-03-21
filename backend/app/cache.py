import json
import redis
from app.config import settings
from typing import Optional, Any

class CacheManager:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async def get(self, key: str) -> Optional[Any]:
        """Retrieve value from cache"""
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, expiry: int = None) -> bool:
        """Set value in cache with optional expiry"""
        try:
            expiry = expiry or settings.REDIS_CACHE_EXPIRY
            self.redis_client.setex(
                key,
                expiry,
                json.dumps(value)
            )
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    async def clear(self, pattern: str = "*") -> bool:
        """Clear cache by pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False

cache_manager = CacheManager()
