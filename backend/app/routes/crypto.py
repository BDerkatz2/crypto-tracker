from fastapi import APIRouter, Query
from app.services.crypto_service import crypto_service
from app.schemas import CryptoData
from typing import List

router = APIRouter()

@router.get("/search", tags=["crypto"])
async def search_crypto(q: str = Query(..., min_length=1, max_length=100)):
    """Search for cryptocurrencies"""
    results = await crypto_service.search_crypto(q)
    return {
        "results": results,
        "total": len(results)
    }

@router.get("/trending", tags=["crypto"])
async def get_trending():
    """Get trending cryptocurrencies"""
    trending = await crypto_service.get_trending_cryptos()
    return {
        "trending": trending,
        "total": len(trending)
    }

@router.get("/data/{crypto_id}", tags=["crypto"])
async def get_crypto_data(crypto_id: str):
    """Get data for a specific cryptocurrency"""
    data = await crypto_service.get_crypto_data([crypto_id])
    if data:
        return data[0]
    return {"error": "Cryptocurrency not found"}

@router.get("/data", tags=["crypto"])
async def get_cryptos_data(ids: str = Query(...)):
    """Get data for multiple cryptocurrencies"""
    crypto_ids = [id.strip() for id in ids.split(",")]
    data = await crypto_service.get_crypto_data(crypto_ids)
    return {
        "data": data,
        "total": len(data)
    }

@router.get("/history/{crypto_id}", tags=["crypto"])
async def get_price_history(crypto_id: str, days: int = Query(7, ge=1, le=365)):
    """Get price history for a cryptocurrency"""
    history = await crypto_service.get_crypto_price_history(crypto_id, days)
    return history
