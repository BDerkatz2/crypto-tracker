from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Watchlist
from app.schemas import WatchlistCreate, WatchlistResponse
from typing import List

router = APIRouter()

@router.get("/", response_model=List[WatchlistResponse], tags=["watchlist"])
async def get_watchlist(user_id: int, db: Session = Depends(get_db)):
    """Get user's watchlist"""
    watchlist = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    return watchlist

@router.post("/", response_model=WatchlistResponse, tags=["watchlist"])
async def add_to_watchlist(user_id: int, item: WatchlistCreate, db: Session = Depends(get_db)):
    """Add cryptocurrency to watchlist"""
    # Check if already in watchlist
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.crypto_id == item.crypto_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    
    watchlist_item = Watchlist(
        user_id=user_id,
        crypto_id=item.crypto_id,
        symbol=item.symbol
    )
    db.add(watchlist_item)
    db.commit()
    db.refresh(watchlist_item)
    return watchlist_item

@router.delete("/{watchlist_id}", tags=["watchlist"])
async def remove_from_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    """Remove cryptocurrency from watchlist"""
    watchlist_item = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not watchlist_item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    db.delete(watchlist_item)
    db.commit()
    return {"message": "Removed from watchlist"}
