# Crypto Tracker Application

A comprehensive cryptocurrency tracking application built with Python/FastAPI (backend), React (frontend), Redis (caching), and real-time data visualization.

## Features

✨ **Core Features:**
- 🔍 **Crypto Search & Discovery** - Browse and search cryptocurrencies from CoinGecko API
- 📊 **Data Visualization** - Interactive price charts and portfolio allocation charts
- 💼 **Portfolio Management** - Track your cryptocurrency holdings with purchase history
- 👁️ **Watchlist** - Monitor favorite cryptocurrencies
- 📈 **User-Specific Insights** - Detailed portfolio analytics and performance metrics
- ⚡ **Redis Caching** - Fast data retrieval with intelligent caching strategy
- 🎨 **Modern UI** - Responsive design with Tailwind CSS

## Project Structure

```
crypto-tracker/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── main.py         # FastAPI app
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database setup
│   │   ├── cache.py        # Redis caching
│   │   └── schemas.py      # Pydantic schemas
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml      # Docker Compose setup
```

## Tech Stack

### Backend
- **Framework:** FastAPI
- **Database:** SQLite (development) / PostgreSQL (production)
- **Cache:** Redis
- **ORM:** SQLAlchemy
- **API Client:** HTTPX (async)
- **External API:** CoinGecko (free, no key required)

### Frontend
- **Library:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Routing:** React Router

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Caching:** Redis

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional, for containerized setup)
- Redis (or use Docker)

### Local Development Setup

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Start Redis (if not using Docker)
# macOS: brew services start redis
# Windows: Download from https://github.com/microsoftarchive/redis/releases

# Run the backend
uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (if needed)
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### Docker Setup (Recommended)

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Redis: `localhost:6379`

## API Endpoints

### Cryptocurrency Data
- `GET /api/v1/crypto/search?q={query}` - Search cryptocurrencies
- `GET /api/v1/crypto/trending` - Get trending cryptocurrencies
- `GET /api/v1/crypto/data?ids={id1,id2}` - Get crypto data
- `GET /api/v1/crypto/history/{crypto_id}?days={days}` - Get price history

### Watchlist
- `GET /api/v1/watchlist?user_id={id}` - Get user's watchlist
- `POST /api/v1/watchlist?user_id={id}` - Add to watchlist
- `DELETE /api/v1/watchlist/{id}` - Remove from watchlist

### Portfolio
- `GET /api/v1/portfolio?user_id={id}` - Get portfolio
- `POST /api/v1/portfolio?user_id={id}` - Add to portfolio
- `PUT /api/v1/portfolio/{id}` - Update portfolio item
- `DELETE /api/v1/portfolio/{id}` - Delete portfolio item

### Insights
- `GET /api/v1/insights/portfolio/{user_id}` - Get portfolio insights
- `GET /api/v1/insights/market` - Get market insights

## Features Detail

### 1. Redis Caching Strategy
- **Crypto Data:** Cached for 5 minutes (configurable)
- **Price History:** Cached for 1 hour
- **Trending Cryptos:** Cached for 30 minutes
- **Cache Invalidation:** Automatic with TTL or manual deletion

### 2. Portfolio Insights
Analyzes user's portfolio and provides:
- Total portfolio value and invested amount
- Profit/Loss calculations
- Best/Worst performing assets
- Asset diversity score
- Top holdings breakdown

### 3. Data Visualization
- **Price Charts:** Interactive area charts with multiple time periods
- **Portfolio Allocation:** Pie chart showing asset distribution
- **Performance Tracking:** Real-time profit/loss indicators

### 4. User-Specific Features
- Personalized portfolio tracking
- Custom watchlist management
- Portfolio-specific insights and analytics
- Historical purchase tracking

## Configuration

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=sqlite:///./crypto_tracker.db
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_EXPIRY=300
SECRET_KEY=your-secret-key
CORS_ORIGINS=["http://localhost:3000"]
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:8000/api/v1
```

## Performance Optimization

1. **Redis Caching** - Reduces API calls and improves response times
2. **Async Operations** - Non-blocking I/O for better scalability
3. **Lazy Loading** - Frontend components load data on demand
4. **Chart Optimization** - Efficient rendering with Recharts

## Development Tips

### Adding New Cryptos to Watchlist
Use CoinGecko IDs (e.g., 'bitcoin', 'ethereum', 'cardano')

### Customizing Cache TTL
Edit `REDIS_CACHE_EXPIRY` in `backend/.env`

### Styling
Tailwind CSS classes are used throughout. Edit `tailwind.config.js` to customize theme.

## Production Deployment

For production:
1. Use PostgreSQL instead of SQLite
2. Set up environment-specific `.env` files
3. Use production Redis instance
4. Enable HTTPS/SSL
5. Configure proper CORS origins
6. Use production-grade database backups

Example production `.env`:
```
DATABASE_URL=postgresql://user:password@prod-db:5432/crypto_tracker
REDIS_URL=redis://:password@prod-redis:6379/0
SECRET_KEY=very-secure-random-key
CORS_ORIGINS=["https://yourdomain.com"]
```

## Troubleshooting

### Redis Connection Error
- Ensure Redis is running: `redis-cli ping`
- Check Redis URL in `.env`

### Frontend API Errors
- Ensure backend is running and accessible
- Check CORS settings in `backend/app/config.py`

### Port Already in Use
- Backend (8000): `netstat -ano | findstr :8000` (Windows)
- Frontend (3000): `netstat -ano | findstr :3000` (Windows)

## Future Enhancements

- User authentication and authorization
- Email alerts for price changes
- Advanced portfolio analytics (tax reporting, etc.)
- Mobile app
- WebSocket for real-time price updates
- Advanced charting with TradingView Lightweight Charts

## License

MIT License

## Support

For issues or questions, please create an issue in the repository.

---

Happy tracking! 🚀
