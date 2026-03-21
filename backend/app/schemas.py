from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    crypto_id: str
    symbol: str

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    crypto_id: str
    symbol: str
    added_at: datetime
    
    class Config:
        from_attributes = True

# Portfolio Schemas
class PortfolioCreate(BaseModel):
    crypto_id: str
    symbol: str
    amount: float
    purchase_price: float
    purchase_date: datetime

class PortfolioUpdate(BaseModel):
    amount: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None

class PortfolioResponse(BaseModel):
    id: int
    user_id: int
    crypto_id: str
    symbol: str
    amount: float
    purchase_price: float
    purchase_date: datetime
    current_value: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# Crypto Data Schema
class CryptoData(BaseModel):
    id: str
    name: str
    symbol: str
    current_price: float
    market_cap: float
    market_cap_rank: int
    total_volume: float
    price_change_24h: float
    price_change_percentage_24h: float
    circulating_supply: float
    max_supply: Optional[float]
    ath: float
    atl: float

class CryptoPriceHistory(BaseModel):
    timestamp: datetime
    price: float

# Insights Schema
class PortfolioInsights(BaseModel):
    total_value: float
    total_invested: float
    profit_loss: float
    profit_loss_percentage: float
    best_performer: Optional[str]
    worst_performer: Optional[str]
    top_holdings: List[dict]
    diversity_score: float

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str
