from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routes import crypto, watchlist, portfolio, insights

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Crypto Tracker API with Redis caching and user-specific insights"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(crypto.router, prefix=f"{settings.API_V1_STR}/crypto")
app.include_router(watchlist.router, prefix=f"{settings.API_V1_STR}/watchlist")
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio")
app.include_router(insights.router, prefix=f"{settings.API_V1_STR}/insights")

@app.get("/", tags=["root"])
async def root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to Crypto Tracker API",
        "version": settings.VERSION,
        "docs": "/docs",
        "endpoints": [
            "/api/v1/crypto",
            "/api/v1/watchlist",
            "/api/v1/portfolio",
            "/api/v1/insights"
        ]
    }

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
