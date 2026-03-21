from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.insights_service import insights_service

router = APIRouter()

@router.get("/portfolio/{user_id}", tags=["insights"])
async def get_portfolio_insights(user_id: int, db: Session = Depends(get_db)):
    """Get portfolio insights for a user"""
    insights = await insights_service.get_portfolio_insights(user_id, db)
    return insights

@router.get("/market", tags=["insights"])
async def get_market_insights():
    """Get general market insights"""
    insights = await insights_service.get_market_insights()
    return insights
