import os
import json
from dotenv import load_dotenv

load_dotenv()


def _parse_cors_origins() -> list[str]:
    """Parse CORS_ORIGINS from env as JSON array or comma-separated values."""
    raw = os.getenv("CORS_ORIGINS")
    if not raw:
        return [
            "http://localhost:3000",
            "http://localhost:8000",
        ]

    # Accept JSON array input: ["https://a.com", "https://b.com"]
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            cleaned = [str(origin).strip() for origin in parsed if str(origin).strip()]
            if cleaned:
                return cleaned
    except Exception:
        pass

    # Fallback to comma-separated values.
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

class Settings:
    # API Configuration
    PROJECT_NAME = "Crypto Tracker"
    VERSION = "1.0.0"
    API_V1_STR = "/api/v1"
    
    # Database Configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crypto_tracker.db")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_EXPIRY = int(os.getenv("REDIS_CACHE_EXPIRY", 300))  # 5 minutes
    
    # JWT Configuration
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # Crypto API Configuration
    COINGECKO_API_URL = "https://api.coingecko.com/api/v3"
    COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY", "")
    
    # CORS Configuration
    CORS_ORIGINS = _parse_cors_origins()

settings = Settings()
