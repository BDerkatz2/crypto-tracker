from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Portfolio
from app.schemas import PortfolioCreate, PortfolioResponse, PortfolioUpdate
from typing import List

router = APIRouter()

@router.get("/", response_model=List[PortfolioResponse], tags=["portfolio"])
async def get_portfolio(user_id: int, db: Session = Depends(get_db)):
    """Get user's portfolio"""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    return portfolio

@router.post("/", response_model=PortfolioResponse, tags=["portfolio"])
async def add_to_portfolio(user_id: int, item: PortfolioCreate, db: Session = Depends(get_db)):
    """Add cryptocurrency to portfolio"""
    portfolio_item = Portfolio(
        user_id=user_id,
        crypto_id=item.crypto_id,
        symbol=item.symbol,
        amount=item.amount,
        purchase_price=item.purchase_price,
        purchase_date=item.purchase_date,
        current_value=item.amount * item.purchase_price
    )
    db.add(portfolio_item)
    db.commit()
    db.refresh(portfolio_item)
    return portfolio_item

@router.put("/{portfolio_id}", response_model=PortfolioResponse, tags=["portfolio"])
async def update_portfolio(
    portfolio_id: int,
    item: PortfolioUpdate,
    db: Session = Depends(get_db)
):
    """Update portfolio item"""
    portfolio_item = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio_item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    if item.amount is not None:
        portfolio_item.amount = item.amount
    if item.purchase_price is not None:
        portfolio_item.purchase_price = item.purchase_price
    if item.purchase_date is not None:
        portfolio_item.purchase_date = item.purchase_date
    
    portfolio_item.current_value = portfolio_item.amount * portfolio_item.purchase_price
    
    db.commit()
    db.refresh(portfolio_item)
    return portfolio_item

@router.delete("/{portfolio_id}", tags=["portfolio"])
async def delete_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Delete portfolio item"""
    portfolio_item = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio_item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    db.delete(portfolio_item)
    db.commit()
    return {"message": "Portfolio item deleted"}
