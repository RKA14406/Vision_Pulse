# VisionPulse AI

> AI-powered financial market intelligence — turn economic events into structured, explainable, and accountable predictions.

VisionPulse AI is an **educational decision-support tool** that maps financial news and macro events to asset reactions, generates AI-driven predictions via Google Gemini, and reviews its own accuracy after events resolve.

**Not a trading bot. Not financial advice. Built for clarity.**

---

## Features

- **Asset Watchlist** — Live quotes for Gold, Silver, BTC, ETH, Oil, SPY, QQQ, and NVIDIA with source badges and sensitivity tags
- **Smart Event Calendar** — CPI, FOMC, OPEC, crypto ETF news, earnings windows, and geopolitical risk events with asset/category filters
- **AI Prediction Generator** — Select an event + asset to generate a focused card: `Gold: -0.32%, Safe, 89% sure`
- **Post-Event Reviews** — Predicted vs. actual outcome with accuracy score and lesson learned
- **Graceful Fallbacks** — Works without any API keys using seeded mock data; each card shows whether data is live, cached, or mocked

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES6) |
| Backend | Node.js 18+ · Express 4 |
| AI | Google Gemini (`gemini-1.5-flash`) with rule-based fallback |
| Market Data | Alpha Vantage · Finnhub |
| Macro Data | FRED (Federal Reserve) |
| News | NewsAPI |
| Energy | EIA (Energy Information Administration) |
| Storage | Local JSON files (`/data/`) |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- API keys (all optional — app falls back to mock data if missing)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd Vision_Pulse-main

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
cp .env.example .env   # Mac/Linux
copy .env.example .env  # Windows
```

Edit `backend/.env` and fill in your API keys:

```env
PORT=5000
NODE_ENV=development

GEMINI_API_KEY=your_gemini_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
FRED_API_KEY=your_fred_api_key_here
NEWS_API_KEY=your_news_api_key_here
EIA_API_KEY=your_eia_api_key_here
```

### Run

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Open **http://localhost:5000** in your browser.

> Windows users: double-click `run_windows.bat` in the project root as a shortcut.

---

## How It Works

```
Market Event + Selected Asset
         ↓
Backend classifies the event category
         ↓
Rule-based impact map sets a baseline
         ↓
Gemini builds a reasoned prediction (or rules fire as fallback)
         ↓
Frontend displays one focused prediction card
         ↓
Post-event review compares prediction vs. actual movement
```

### Prediction Card Format

```
Gold: -0.32%, Safe, 89% sure
BTC:  +0.62%, Risky, 76% sure
Oil:  +0.86%, Risky, 70% sure
```

Each card includes direction, expected move %, risk level, confidence, reasoning, historical comparison, and a safety disclaimer.

---

## API Reference

### Health

```
GET /api/health
```

### Assets

```
GET /api/assets               # All assets (seeded prices)
GET /api/assets?live=true     # With live market quotes
GET /api/assets/:symbol       # Single asset
```

### Events

```
GET /api/events                     # All events
GET /api/events?asset=GOLD          # Filter by asset
GET /api/events?category=macro      # Filter by category
GET /api/events/:id                 # Single event
```

### Predictions

```
GET  /api/predictions               # Prediction history
POST /api/predictions/generate      # Generate a new prediction
```

**POST body:**
```json
{
  "eventId": "evt_cpi_us_001",
  "assetSymbol": "GOLD"
}
```

**Response shape:**
```json
{
  "assetSymbol": "GOLD",
  "eventId": "evt_cpi_us_001",
  "direction": "down",
  "expectedMovePct": -0.32,
  "riskLevel": "Safe",
  "confidence": 89,
  "mainPrediction": { "text": "Gold: -0.32%, Safe, 89% sure" },
  "reasoning": "Higher CPI reduces real yields, pressuring gold...",
  "historicalNote": "Gold fell in 4 of the last 5 CPI beats.",
  "disclaimer": "Educational market intelligence only. Not financial advice."
}
```

### Reviews

```
GET /api/reviews
GET /api/reviews/summary
```

### Market Data

```
GET /api/market/quote/:symbol
GET /api/market/quotes?symbols=GOLD,SILVER,BTC,SPY
```

### News & Macro

```
GET /api/news?query=gold&pageSize=5
GET /api/macro/overview
GET /api/macro/fred/CPIAUCSL
GET /api/macro/energy/oil
```

### AI Status

```
GET /api/ai/status
```

---

## Project Structure

```
Vision_Pulse-main/
├── backend/
│   ├── config/          # Environment & API key loader
│   ├── controllers/     # Route handlers
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic & external API wrappers
│   │   ├── gemini.service.js
│   │   ├── market.service.js
│   │   ├── prediction.service.js
│   │   └── ...
│   ├── utils/
│   │   ├── impactRules.js   # Rule-based fallback logic
│   │   └── assetMapper.js   # Symbol normalization
│   ├── .env.example
│   └── server.js
├── data/
│   ├── assets.json
│   ├── events.json
│   ├── predictions.json
│   ├── mock_reviews.json
│   └── historical_matches.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── run_windows.bat
```

---

## Fallback Architecture

Every data source has a fallback layer so the app never breaks:

| Missing Key | Fallback |
|---|---|
| `GEMINI_API_KEY` | Rule-based prediction logic |
| `ALPHA_VANTAGE_API_KEY` | Mock prices or Finnhub |
| `FINNHUB_API_KEY` | Alpha Vantage or mock |
| `NEWS_API_KEY` | Seeded event headlines |
| `FRED_API_KEY` | Seeded macro values |
| `EIA_API_KEY` | Mock energy data |

Asset cards display a source badge (`live`, `cached`, or `mock`) so users always know the data provenance.

---

## Supported Assets

| Symbol | Name | Category |
|---|---|---|
| GOLD | Gold Spot (XAU/USD) | Metals |
| SILVER | Silver Spot (XAG/USD) | Metals |
| BTC | Bitcoin | Crypto |
| ETH | Ethereum | Crypto |
| OIL | WTI Crude | Energy |
| SPY | S&P 500 ETF | Equity |
| QQQ | Nasdaq 100 ETF | Equity |
| NVDA | Nvidia | Stock |

> Gold and Silver use Alpha Vantage's metals/spot endpoint (`XAU/USD`, `XAG/USD`), not the stock quote endpoint.

---

## Disclaimer

VisionPulse AI is an **educational market intelligence prototype**. It does not provide financial advice, investment recommendations, or buy/sell signals. All predictions are probabilistic and may be wrong. Users are solely responsible for their own financial decisions.

---

## License

This project was built as a hackathon MVP. See repository for license details.
