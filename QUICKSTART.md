# Quick Start Guide for Crypto Tracker

## Option 1: Docker (Recommended - Easiest)

### Windows
```
setup.bat
```

### macOS/Linux
```
bash setup.sh
```

Or manually:
```bash
docker-compose up -d
```

✅ **Done!** Access the app at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Option 2: Manual Setup (Advanced)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis
- Git

### Step 1: Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn app.main:app --reload
```

Backend runs on: `http://localhost:8000`

### Step 2: Frontend (in new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Step 3: Redis (in new terminal)

Make sure Redis is running:
```bash
redis-server
```

---

## First Steps

1. **Open Frontend:** http://localhost:3000
2. **Search Cryptos:** Use the search bar on Dashboard
3. **Add to Watchlist:** Click on any crypto and add to watchlist
4. **Manage Portfolio:** Add your holdings with purchase history
5. **View Insights:** Check portfolio analysis and performance metrics

---

## Default Demo User
- User ID: 1 (hardcoded for demo)

For production, implement proper authentication!

---

## Stop Services

### Docker
```bash
docker-compose down
```

### Manual
Stop each terminal with `Ctrl+C`

---

## Troubleshooting

**Backend won't start:**
- Ensure Redis is running
- Check Python version (need 3.11+)

**Frontend won't connect to backend:**
- Ensure backend is running on port 8000
- Check CORS settings

**Redis connection error:**
- Start Redis: `redis-server`
- Or use Docker: `docker run -p 6379:6379 redis:7-alpine`

---

For more details, see README.md
