# Prediction Persistence Schema

## 1. Feature Overview

Strict schema enforcement for all saved predictions.  
Every prediction written to `predictions.json` is normalized to exactly 9 fields — no exceptions.

---

## 2. Purpose

Prior to this change, predictions were saved with inconsistent shapes: mixed field names (`assetSymbol` vs `asset`), confidence stored as both 0–100 integers and 0–1 floats, direction expressed as `"up"/"down"` or as labels like `"volatile_to_bullish"`. This made client-side rendering brittle and the data file unreliable as a source of truth.

---

## 3. Implementation Summary

| Layer | Change |
|---|---|
| `dataStore.service.js` | Added `normalizePrediction(raw)` — single source of truth for schema enforcement. `savePrediction` normalizes before writing and returns the saved object. |
| `prediction.service.js` | `normalizePredictionPayload` now outputs schema-compliant objects directly. Removed `mainPrediction`, `reasoning`, `historicalMatches`, `riskLevel`, and 5 other extraneous fields. |
| `predictions.controller.js` | Asset filter targets `prediction.asset`. `createPrediction` returns the normalized saved object. |
| `frontend/script.js` | `predictionMain()` reads `asset`, `direction`, `prediction`, and confidence as 0–1 float. Scoreboard renders Direction / Confidence / Status. |
| `data/predictions.json` | One-time migration — all 72 existing records normalized to new schema. |

---

## 4. Data Flow

```
POST /api/predictions/generate
  │
  ├─ Controller validates: assetSymbol, eventId|customEvent
  │
  ├─ prediction.service: generatePrediction()
  │     ├─ classifyImpact()       → rule baseline
  │     ├─ findHistoricalMatches() → context
  │     ├─ askGemini()            → AI summary (optional)
  │     └─ normalizePredictionPayload() → schema-compliant object
  │
  ├─ dataStore.service: savePrediction()
  │     ├─ normalizePrediction()  → enforces schema (safety net)
  │     ├─ predictions.push(normalized)
  │     ├─ writeJson("predictions.json")
  │     └─ returns normalized prediction
  │
  └─ Response: { success: true, data: <normalized prediction> }
```

---

## 5. Data Structure

```json
{
  "id":         "pred_rule_1777404690450",
  "eventId":    "evt_cpi_us_001",
  "asset":      "GOLD",
  "prediction": "Gold: bearish bias. Depends on surprise, liquidity, and market context.",
  "confidence": 0.78,
  "direction":  "bearish",
  "status":     "pending",
  "source":     "rules_only",
  "createdAt":  "2026-04-28T19:31:30.451Z"
}
```

**Field rules:**

| Field | Type | Constraint |
|---|---|---|
| `id` | string | `pred_live_<ts>` or `pred_rule_<ts>` |
| `eventId` | string | references `events.json` |
| `asset` | string | uppercase ticker, e.g. `"GOLD"` |
| `prediction` | string | AI or rule-generated summary |
| `confidence` | float | `0.0 – 1.0` (4 decimal places) |
| `direction` | string | `"bullish"` or `"bearish"` only |
| `status` | string | always `"pending"` at creation |
| `source` | string | `"gemini_plus_rules"`, `"rules_only"`, `"mock"`, etc. |
| `createdAt` | ISO 8601 | UTC timestamp |

---

## 6. API Endpoints

```
GET  /api/predictions
     ?eventId=<id>          filter by event
     ?asset=<TICKER>        filter by asset (matches prediction.asset)
     → last 10, newest first

POST /api/predictions/generate
     Body: { eventId, assetSymbol }
        or { assetSymbol, customEvent: { ... } }
     → normalized prediction object
```

---

## 7. Key Design Decisions

- **`normalizePrediction` is idempotent.** Safe to apply to already-normalized data (used as a safety net in `savePrediction` even though the service already outputs clean objects).
- **Direction is derived, not stored raw.** Labels like `"volatile_to_bullish"` and directions like `"up"` are collapsed at write time. Consumers always get `"bullish"` or `"bearish"`.
- **Confidence is always 0–1.** The migration detects legacy 0–100 integers (`> 1`) and divides automatically.
- **Stripped fields are not archived.** `mainPrediction`, `reasoning`, `historicalMatches`, `riskLevel`, `volatility`, `expectedMovePct`, `riskWarning`, `aiNote`, `generatedAt` are discarded at write time — not stored.
- **One-time migration ran inline.** All 72 existing records rewritten via Node script; no migration table or version flag needed at MVP scale.

---

## 8. Limitations (MVP)

- `status` is always `"pending"` — no lifecycle transitions (fulfilled, expired, reviewed).
- No schema version field; adding a new required field will require another migration script.
- `predictions.json` is rewritten in full on every save — not suitable beyond ~1 000 records.
- `direction` loses nuance: `"volatile"` or `"uncertain"` labels collapse to a binary signal.
- No deduplication — the same event+asset combination can be saved multiple times.
