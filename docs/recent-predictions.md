# Recent Predictions System (v2)

## 1. Feature Overview

A dynamic prediction history system with **real-time updates** and an **in-place focused view**.

Users can:

* View latest predictions in a dedicated tab
* Click any prediction to inspect it instantly (no navigation)
* See a highlighted “Focused Prediction” within the same context

---

## 2. Purpose

Originally, predictions were only visible after generation or via local storage.

This system introduces:

* A **global prediction history**
* A **non-disruptive inspection workflow**
* A more **professional trading-dashboard interaction model**

---

## 3. Implementation Summary

| Layer               | Change                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| frontend/index.html | Added "Predictions" tab + focused container                                    |
| frontend/script.js  | Added renderRecentPredictions(), renderSelectedPrediction(), initPredictions() |
| frontend/style.css  | Enhanced card system + active state + focused card styling                     |
| backend API         | Reused GET /api/predictions (latest 10, sorted)                                |

---

## 4. Data Flow

```
User loads dashboard
  │
  ├─ loadDashboard()
  │     ├─ Loads predictions into state
  │     ├─ Restores selectedPrediction from localStorage (if exists)
  │
  ├─ initPredictions()
  │     ├─ renderRecentPredictions(state.predictions)
  │     ├─ setInterval → refresh every 10s
  │
  ├─ fetchPredictions()
  │     └─ GET /api/predictions
  │
  ├─ renderRecentPredictions()
  │     ├─ Render list of prediction cards
  │     ├─ Attach click handlers
  │
  └─ On click:
        ├─ state.selectedPrediction = prediction
        ├─ Save to localStorage
        ├─ renderSelectedPrediction()
        └─ Highlight active card
```

---

## 5. UI Structure

### Predictions Tab Layout

```
[ Focused Prediction (selectedPredictionContainer) ]

[ Divider ]

[ Prediction History List (recentPredictionsContainer) ]
```

---

### Prediction Card (List)

* Asset (e.g. GOLD, BTC)
* Direction (Bullish / Bearish)
* Summary (truncated)
* Confidence (%)
* Status (pending)
* Clickable (activates focused view)

---

### Focused Prediction (Top Section)

* Larger, highlighted card
* Full summary
* Direction + confidence + status
* Persistent until another selection is made

---

## 6. Key Design Decisions

* **No page navigation**

  * Uses internal tab system only
  * Preserves user context

* **In-place drill-down**

  * Click → expand above list
  * Inspired by trading dashboards (Bloomberg-style)

* **Single source of truth**

  * Uses state.selectedPrediction
  * Synced with localStorage

* **Backend-driven data**

  * No frontend sorting/filtering duplication

* **Auto-refresh (10s)**

  * Keeps prediction feed live

* **Visual hierarchy**

  * Focused prediction clearly separated from list

* **Active card highlighting**

  * Improves selection clarity

---

## 7. Improvements Over v1

* Added dedicated **Predictions tab**
* Removed dependency on Predict tab for viewing results
* Introduced **focused prediction preview**
* Eliminated disruptive navigation
* Improved UX consistency with dashboard paradigm

---

## 8. Limitations (Current)

* No pagination beyond 10 predictions
* No filtering (asset / direction / status)
* No lifecycle tracking (pending → resolved)
* No manual refresh control
* No error-state UI (console only)
* No backend persistence for "selected" state

---

## 9. Future Enhancements

* Split-view layout (list + detail side-by-side)
* Prediction accuracy tracking over time
* Filters (asset, direction, confidence range)
* Status transitions (pending → correct/incorrect)
* Manual refresh + loading states
* WebSocket/live streaming instead of polling
