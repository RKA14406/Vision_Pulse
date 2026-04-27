# VisionPulse AI — Hackathon MVP

**VisionPulse AI** is an AI-powered financial market intelligence website MVP.

It connects:

- Asset watchlist
- Smart event calendar
- Market/news/macro API routes
- AI prediction cards
- Historical comparison logic
- Post-event review examples
- Safety disclaimer layer

This version is intentionally simple and functional first. It is built for testing everything quickly before improving the UI.

---

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Data: local JSON seed files
- APIs prepared:
  - FRED
  - Finnhub
  - Alpha Vantage
  - NewsAPI
  - Gemini
  - EIA

The app works even without API keys by using mock/seeded fallback data.

---

## Folder Structure

```txt
VisionPulse_AI_MVP/
├─ backend/
│  ├─ config/
│  ├─ controllers/
│  ├─ jobs/
│  ├─ routes/
│  ├─ services/
│  ├─ utils/
│  ├─ .env.example
│  ├─ package.json
│  └─ server.js
├─ data/
│  ├─ assets.json
│  ├─ events.json
│  ├─ predictions.json
│  ├─ mock_reviews.json
│  └─ historical_matches.json
├─ frontend/
│  ├─ index.html
│  ├─ style.css
│  └─ script.js
├─ START_HERE.txt
├─ TESTING_CHECKLIST.md
└─ README.md
```

---

## Run Instructions

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Open:

```txt
http://localhost:5000
```

For Mac/Linux, use:

```bash
cp .env.example .env
npm run dev
```

---

## API Routes

### Core

```txt
GET /api/health
GET /api
```

### Assets

```txt
GET /api/assets
GET /api/assets?live=true
GET /api/assets/:symbol
```

### Events

```txt
GET /api/events
GET /api/events?asset=GOLD
GET /api/events?category=macro
GET /api/events/:id
```

### Predictions

```txt
GET /api/predictions
POST /api/predictions/generate
```

POST body:

```json
{
  "eventId": "evt_cpi_us_001",
  "assetSymbol": "GOLD"
}
```

### Reviews

```txt
GET /api/reviews
GET /api/reviews/summary
```

### Market Data

```txt
GET /api/market/quote/GOLD
GET /api/market/quotes?symbols=GOLD,BTC,SPY
```

### News

```txt
GET /api/news?query=gold&pageSize=5
```

### Macro / Energy

```txt
GET /api/macro/overview
GET /api/macro/fred/CPIAUCSL
GET /api/macro/energy/oil
```

### AI

```txt
GET /api/ai/status
```

---

## How API Fallback Works

If API keys are missing or a provider request fails, the backend returns seeded/mock data instead of breaking the app.

Examples:

- Missing `NEWS_API_KEY` returns seeded event headlines.
- Missing `FRED_API_KEY` returns seeded CPI/Fed/unemployment values.
- Missing `GEMINI_API_KEY` uses rule-based prediction logic.
- Missing `ALPHA_VANTAGE_API_KEY` and `FINNHUB_API_KEY` returns mock asset prices.

This is intentional for hackathon reliability.

---

## Next Development Priorities

1. Improve dashboard UI polish.
2. Add actual chart widget or lightweight-charts.
3. Save generated Gemini predictions into JSON or database.
4. Add cron jobs for scheduled ingestion.
5. Add real post-event review calculations from price data.
6. Add user watchlist persistence.
7. Deploy backend and frontend.

---

## Safety Position

VisionPulse AI is an educational market intelligence and decision-support prototype.

It is not financial advice, not a trading bot, not a broker, and not a buy/sell signal system.
