import os
from dotenv import load_dotenv

load_dotenv()

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
    
    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

settings = Settings()
