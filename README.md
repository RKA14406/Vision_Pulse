# VisionPulse AI — Hackathon MVP

**VisionPulse AI** is an AI-powered financial market intelligence website MVP.

It helps users understand **which market events matter**, **which assets may react**, **what the AI expects**, and **how accurate previous predictions were after the event**.

The system is built as an educational decision-support tool. It is **not** a trading bot, broker, buy/sell signal platform, or financial advice system.

---

## 1. Project Goal

VisionPulse AI turns financial news and economic events into structured market intelligence.

The MVP connects:

- Asset watchlist
- Smart event calendar
- Market/news/macro API routes
- AI prediction cards
- Numeric main predictions
- Historical comparison logic
- Post-event review examples
- API fallback layer
- Safety disclaimer layer

Main MVP flow:

```txt
Market Event + Selected Asset
        ↓
Backend classifies the event
        ↓
Backend maps affected assets
        ↓
Market/API data is loaded
        ↓
Gemini or rule fallback generates prediction
        ↓
Frontend displays one focused prediction card
        ↓
Post-event review compares prediction vs actual movement
```

---

## 2. Tech Stack

```txt
Frontend: HTML, CSS, JavaScript
Backend: Node.js + Express
Data: Local JSON seed files
AI: Gemini API with rule-based fallback
Market data: Alpha Vantage + Finnhub fallback
Macro data: FRED
News data: NewsAPI
Energy data: EIA
```

The app works even if some API keys are missing by using local seeded/mock fallback data.

---

## 3. Current MVP Features

### Dashboard

Shows the full product command center:

- Backend connection status
- Gemini status
- Educational disclaimer
- Asset watchlist
- Smart event calendar
- Prediction generator
- Post-event review cards

### Asset Watchlist

Displays watchable assets such as:

```txt
Gold Spot
Silver Spot
Bitcoin
Ethereum
Oil
SPY
QQQ
Nvidia
```

Each card shows:

- Asset name
- Symbol/category
- Price
- Percentage change
- Data source badge
- Last updated time
- Main market sensitivity tags

Important metals update:

```txt
Gold and silver should use Alpha Vantage metals/spot logic, not stock/ETF quote logic.
```

Gold should be treated as:

```txt
Gold Spot — XAU/USD
```

Silver should be treated as:

```txt
Silver Spot — XAG/USD
```

Do not mix spot metals with ETF labels like `GLD` or `SLV` unless the app is intentionally showing ETF prices.

### Smart Event Calendar

Shows important financial events such as:

- CPI inflation reports
- FOMC meetings
- Fed speeches
- OPEC updates
- Crypto ETF headlines
- Earnings risk windows
- Geopolitical risk events

Each event card shows:

- Event title
- Importance level
- Event time
- Description
- Category tags
- Affected assets

### Prediction Generator

The user chooses:

```txt
1. Event
2. Asset
3. Generate AI / Rule Prediction
```

The frontend should show **only the generated card for the selected event + selected asset**.

Expected prediction format:

```txt
BTC: +0.62%, Risky, 76% sure
Gold: -0.32%, Safe, 89% sure
Oil: +0.86%, Risky, 70% sure
```

Each prediction card should include:

- Main prediction number
- Direction
- Expected movement percentage
- Risk level
- Confidence percentage
- Reasoning
- Historical comparison note
- Safety disclaimer

### Post-Event Reviews

Shows examples of accountability after events.

Each review compares:

```txt
Predicted outcome vs actual outcome
```

Review cards show:

- Asset
- Previous event
- Accuracy score
- Predicted direction
- Actual direction
- Actual percentage move
- Lesson learned

This is one of the strongest parts of the project because the system does not only predict — it reviews itself.

---

## 4. User Flow — How the User Uses the Website

### Flow 1 — Quick Dashboard Check

```txt
User opens website
      ↓
Sees backend/Gemini status
      ↓
Reads disclaimer
      ↓
Checks asset watchlist
      ↓
Checks upcoming high-impact events
      ↓
Chooses an event + asset for deeper analysis
```

### Flow 2 — Generate a Prediction

```txt
User opens Prediction Generator
      ↓
Selects event, example: US CPI Inflation Report
      ↓
Selects asset, example: Gold Spot
      ↓
Clicks Generate AI / Rule Prediction
      ↓
System returns one focused card
      ↓
User sees:
  - Gold: -0.32%
  - Risk level: Safe/Risky/Volatile
  - Confidence: 89% sure
  - Explanation
  - Historical comparison
  - Safety disclaimer
```

### Flow 3 — Review Past Accuracy

```txt
User scrolls to Post-Event Reviews
      ↓
Checks old prediction vs actual movement
      ↓
Reads lesson learned
      ↓
Understands how the model can improve after events
```

### Flow 4 — Filter Events

```txt
User selects asset filter
      ↓
Calendar shows only events related to that asset
      ↓
User selects category filter
      ↓
Calendar narrows to macro, crypto, earnings, energy, or geopolitical events
```

---

## 5. System Flow — How the Backend Works

### Data Loading Flow

```txt
Frontend request
      ↓
Express route
      ↓
Controller
      ↓
Service layer
      ↓
External API attempt
      ↓
If API works → return live/cached provider result
If API fails → return seeded/mock fallback
      ↓
Frontend renders stable card
```

### Prediction Flow

```txt
POST /api/predictions/generate
      ↓
Receive eventId + assetSymbol
      ↓
Load selected event from events.json
      ↓
Load selected asset from assets.json
      ↓
Load historical matches
      ↓
Load live/mock market quote
      ↓
Try Gemini prediction
      ↓
If Gemini fails, use rule-based fallback
      ↓
Return numeric prediction object
```

Expected backend prediction object shape:

```json
{
  "assetSymbol": "BTC",
  "eventId": "evt_cpi_us_001",
  "label": "volatile",
  "direction": "up",
  "expectedMovePct": 0.62,
  "riskLevel": "Risky",
  "confidence": 76,
  "mainPrediction": {
    "text": "BTC: +0.62%, Risky, 76% sure"
  },
  "reasoning": "Macro events can affect risk appetite and liquidity...",
  "historicalNote": "BTC often reacts strongly around CPI and Fed repricing.",
  "disclaimer": "Educational market intelligence only. Not financial advice."
}
```

### Post-Event Review Flow

```txt
Prediction created before event
      ↓
Event window ends
      ↓
System checks actual market movement
      ↓
Compare expected direction vs actual direction
      ↓
Calculate accuracy score
      ↓
Store lesson learned
      ↓
Show review card
```

---

## 6. Folder Structure

```txt
VisionPulse_AI_MVP/
├─ backend/
│  ├─ config/
│  │  └─ env.js
│  ├─ controllers/
│  ├─ jobs/
│  ├─ routes/
│  ├─ services/
│  │  ├─ market.service.js
│  │  ├─ gemini.service.js
│  │  ├─ news.service.js
│  │  ├─ fred.service.js
│  │  └─ eia.service.js
│  ├─ utils/
│  │  ├─ assetMapper.js
│  │  └─ impactRules.js
│  ├─ .env.example
│  ├─ package.json
│  ├─ api-tests.http
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

## 7. Environment File Setup

Create this file:

```txt
backend/.env
```

Use this template:

```env
PORT=5000
NODE_ENV=development

FRED_API_KEY=your_fred_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
NEWS_API_KEY=your_news_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
EIA_API_KEY=your_eia_api_key_here
```

Also keep this file in the project:

```txt
backend/.env.example
```

It should contain the same variable names but no private real keys.

### Important Rules

```txt
Never push real .env keys to GitHub.
Only push .env.example.
```

Add this to `.gitignore` if not already included:

```gitignore
node_modules/
.env
.DS_Store
```

### API Usage Notes

```txt
Gold/Silver:
Use Alpha Vantage metals-specific logic.
Do not fetch them as normal stocks.

Stocks/ETFs:
Use Finnhub or Alpha Vantage.

Crypto:
Use Alpha Vantage/Finnhub fallback depending on current service support.

News:
Use NewsAPI, fallback to seeded event/news data.

Macro:
Use FRED, fallback to seeded macro values.

Energy/Oil:
Use EIA or Alpha Vantage energy support, fallback to mock data.

AI:
Use Gemini first, fallback to rule-based prediction.
```

---

## 8. Run Instructions

### Windows

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

### Mac/Linux

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Open:

```txt
http://localhost:5000
```

---

## 9. API Routes

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
GET /api/market/quote/SILVER
GET /api/market/quote/BTC
GET /api/market/quotes?symbols=GOLD,SILVER,BTC,SPY
```

Expected good metals result:

```txt
source: alpha_vantage_metals_spot
```

Acceptable metals fallback:

```txt
source: alpha_vantage_metals_history
```

Stable fallback:

```txt
source: mock
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

## 10. How API Fallback Works

If API keys are missing or a provider request fails, the backend returns seeded/mock data instead of breaking the app.

Examples:

```txt
Missing NEWS_API_KEY → returns seeded event/news headlines
Missing FRED_API_KEY → returns seeded CPI/Fed/unemployment values
Missing GEMINI_API_KEY → uses rule-based prediction logic
Missing ALPHA_VANTAGE_API_KEY → uses mock prices or other provider fallback
Missing FINNHUB_API_KEY → uses Alpha Vantage/mock fallback for supported assets
```

This is intentional for hackathon reliability.

The frontend should clearly show whether a price came from:

```txt
Live API
Mock fallback
Cached result
```

---

## 11. Testing Checklist

### Backend Health

Test:

```txt
http://localhost:5000/api/health
```

Expected:

```json
{
  "success": true
}
```

### Frontend Loads

Open:

```txt
http://localhost:5000
```

Check:

- Page loads without console errors
- Backend status shows OK
- Gemini status appears
- Disclaimer appears

### Asset Watchlist

Check:

- Gold uses `Gold Spot — XAU/USD`
- Silver uses `Silver Spot — XAG/USD`
- Gold/Silver do not show GLD/SLV unless intentionally using ETFs
- Source badge appears
- Last updated time appears

### Metals API

Test:

```txt
http://localhost:5000/api/market/quote/GOLD
http://localhost:5000/api/market/quote/SILVER
```

Preferred result:

```txt
source: alpha_vantage_metals_spot
```

### Event Calendar

Check:

- Events render
- Category badges render
- Affected assets render
- Filters work

### Prediction Generator

Test:

```txt
Event: US CPI Inflation Report
Asset: Gold Spot
```

Expected:

```txt
Only one focused prediction card appears.
It should not show unrelated old seeded cards.
```

Prediction should include:

```txt
Gold: -0.32%, Safe/Risky, 89% sure
```

The exact number can change, but the structure should remain.

### Post-Event Reviews

Check:

- Review cards appear
- Accuracy score appears
- Predicted vs actual movement appears
- Lesson learned appears

---

## 12. Demo Script for Judges

Use this flow during presentation:

```txt
1. Open the dashboard.
2. Show that backend and Gemini are connected.
3. Point to the disclaimer: educational decision-support, not financial advice.
4. Show asset watchlist: gold, silver, BTC, ETH, oil, ETFs, stock.
5. Show that gold/silver use spot metals data through Alpha Vantage logic.
6. Open Smart Event Calendar.
7. Filter by Gold or Bitcoin.
8. Choose CPI/FOMC/OPEC event.
9. Generate prediction.
10. Show numeric main prediction:
    BTC: +0.62%, Risky, 76% sure.
11. Explain the reasoning and historical comparison.
12. Scroll to Post-Event Reviews.
13. Show that the platform reviews its own predictions after the event.
```

Main pitch sentence:

```txt
VisionPulse AI transforms financial news from noise into structured, explainable, and accountable market intelligence.
```

---

## 13. What Was Added / Changed Recently

```txt
1. Prediction Generator now focuses only on the selected event + selected asset.
2. Prediction cards now show numeric main prediction values.
3. Gold and silver now use Alpha Vantage metals-specific logic.
4. Gold/Silver labels changed to spot metals format.
5. Asset cards show data source and last updated time.
6. Technical fallback tags should be hidden from normal users.
7. README now includes user flows, system flows, env setup, API notes, and demo flow.
```

---

## 14. What To Add Next

Priority order:

```txt
1. Add a real chart section with event markers.
2. Save generated predictions to JSON or a database.
3. Add real post-event review calculations from price candles.
4. Add source credibility badges for news/events.
5. Add user watchlist persistence.
6. Add loading states and error messages.
7. Add admin/source panel.
8. Deploy backend and frontend.
```

Recommended future chart options:

```txt
TradingView widget
lightweight-charts
Chart.js for simple MVP line/candle charts
```

Recommended future database:

```txt
SQLite for local MVP
PostgreSQL for scalable version
Supabase for fast hackathon deployment
```

---

## 15. Safety Position

VisionPulse AI is an educational market intelligence and decision-support prototype.

It does not provide:

- Financial advice
- Investment recommendations
- Buy/sell signals
- Guaranteed predictions
- Broker or trading execution services

All predictions are probabilistic and may be wrong. Users are responsible for their own financial decisions.

---

## 16. Project Status

```txt
Current status: Functional connected MVP
Best next step: Data trust + chart section + real review calculation
Hackathon readiness: Strong demo-ready foundation
```
