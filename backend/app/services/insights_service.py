from sqlalchemy.orm import Session
from app.models import Portfolio
from app.services.crypto_service import crypto_service
from typing import List, Dict, Optional

class InsightsService:
    
    @staticmethod
    async def get_portfolio_insights(user_id: int, db: Session) -> Dict:
        """
        Generate user-specific insights about their portfolio
        """
        # Get all portfolio items for the user
        portfolio_items = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
        
        if not portfolio_items:
            return {
                "total_value": 0,
                "total_invested": 0,
                "profit_loss": 0,
                "profit_loss_percentage": 0,
                "best_performer": None,
                "worst_performer": None,
                "top_holdings": [],
                "diversity_score": 0
            }
        
        # Fetch current prices
        crypto_ids = [item.crypto_id for item in portfolio_items]
        current_prices_data = await crypto_service.get_crypto_data(crypto_ids)
        
        # Create price mapping
        price_map = {item["id"]: item["current_price"] for item in current_prices_data}
        
        total_value = 0
        total_invested = 0
        holdings = []
        
        for item in portfolio_items:
            current_price = price_map.get(item.crypto_id, 0)
            current_value = item.amount * current_price
            invested_value = item.amount * item.purchase_price
            profit_loss = current_value - invested_value
            
            total_value += current_value
            total_invested += invested_value
            
            holdings.append({
                "symbol": item.symbol,
                "amount": item.amount,
                "purchase_price": item.purchase_price,
                "current_price": current_price,
                "current_value": current_value,
                "invested_value": invested_value,
                "profit_loss": profit_loss,
                "profit_loss_percentage": ((current_price - item.purchase_price) / item.purchase_price * 100) if item.purchase_price > 0 else 0
            })
        
        holdings.sort(key=lambda x: x["current_value"], reverse=True)
        
        total_profit_loss = total_value - total_invested
        total_profit_loss_percentage = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
        
        best_performer = max(holdings, key=lambda x: x["profit_loss_percentage"]) if holdings else None
        worst_performer = min(holdings, key=lambda x: x["profit_loss_percentage"]) if holdings else None
        
        # Calculate diversity score (0-100)
        diversity_score = min(len(holdings) * 15, 100)  # 15 points per different asset, max 100
        
        return {
            "total_value": round(total_value, 2),
            "total_invested": round(total_invested, 2),
            "profit_loss": round(total_profit_loss, 2),
            "profit_loss_percentage": round(total_profit_loss_percentage, 2),
            "best_performer": best_performer["symbol"] if best_performer else None,
            "worst_performer": worst_performer["symbol"] if worst_performer else None,
            "top_holdings": holdings[:5],  # Top 5 holdings
            "diversity_score": diversity_score
        }
    
    @staticmethod
    async def get_market_insights() -> Dict:
        """Get general market insights"""
        trending = await crypto_service.get_trending_cryptos()
        return {
            "trending_cryptos": trending,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat()
        }

insights_service = InsightsService()
