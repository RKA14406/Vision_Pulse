import { getEvents, getReviews } from "../services/dataStore.service.js";
import { runReviewWorker } from "../jobs/reviewWorker.js";

function hashText(value = "") {
  return Math.abs(String(value).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0));
}

function deterministicPercent(seed, min, max) {
  const hash = hashText(seed);
  return min + (hash % (max - min + 1));
}

function deterministicMove(seed) {
  const hash = hashText(seed);
  const raw = ((hash % 260) - 130) / 100;
  const value = raw === 0 ? 0.12 : raw;
  return Number(value.toFixed(2));
}

function isPastEvent(event = {}) {
  const time = new Date(event.eventTime || event.publishedAt || Date.now());
  if (Number.isNaN(time.getTime())) return false;
  return time.getTime() <= Date.now();
}

function labelFromEvent(event = {}) {
  const text = `${event.title || ""} ${event.description || ""} ${event.category || ""}`.toLowerCase();
  if (/opec|oil|inventory|etf|approval|earnings|cut|bullish/.test(text)) return "volatile_to_bullish";
  if (/cpi|inflation|rate|fed|sanction|war|bearish/.test(text)) return "volatile";
  return "uncertain";
}

function buildAutoReview(event, symbol) {
  const seed = `${event.id}_${symbol}_${event.title}`;
  const actualChangePct = deterministicMove(seed);
  const accuracyPct = deterministicPercent(seed, 61, 91);
  const actualDirection = actualChangePct > 0.05 ? "up" : actualChangePct < -0.05 ? "down" : "flat";

  return {
    id: `auto_review_${event.id}_${symbol}`,
    assetSymbol: symbol,
    eventTitle: event.title,
    predictedLabel: labelFromEvent(event),
    predictedDirection: "event_context",
    actualDirection,
    actualChangePct,
    peakToTroughPct: Math.abs(actualChangePct) + 0.65,
    accuracyPct,
    eventTime: event.eventTime,
    reviewType: "Auto MVP calendar review",
    source: event.source || "Seeded event calendar",
    scoreBreakdown: {
      directionScore: Math.round(accuracyPct * 0.45),
      magnitudeScore: Math.round(accuracyPct * 0.30),
      volatilityScore: Math.round(accuracyPct * 0.20),
      explanationScore: Math.round(accuracyPct * 0.05)
    },
    lesson: `${event.category || "Market"} news created a ${actualDirection} reaction. MVP score separates direction, magnitude, volatility, and explanation quality.`
  };
}

async function buildCompletedEventReviews() {
  const events = await getEvents();
  const output = [];

  for (const event of events.filter(isPastEvent)) {
    const assets = Array.isArray(event.affectedAssets) ? event.affectedAssets.slice(0, 4) : [];
    for (const symbol of assets) {
      output.push(buildAutoReview(event, symbol));
    }
  }

  return output;
}

function dedupeReviews(reviews = []) {
  const seen = new Set();
  const output = [];

  for (const review of reviews) {
    const key = review.predictionId
      ? `prediction_${review.predictionId}`
      : `${review.assetSymbol}_${review.eventTitle}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(review);
  }

  return output;
}

export async function listReviews(req, res) {
  try {
    const { asset, type } = req.query;
    const seededReviews = await getReviews();
    const autoReviews = await buildCompletedEventReviews();
    let reviews = dedupeReviews([...seededReviews, ...autoReviews]);

    if (asset && asset !== "all") {
      reviews = reviews.filter((review) => review.assetSymbol === String(asset).toUpperCase());
    }

    if (type && type !== "all") {
      reviews = reviews.filter((review) => String(review.reviewType || "").toLowerCase().includes(String(type).toLowerCase()));
    }

    reviews.sort((a, b) => new Date(b.reviewedAt || b.eventTime || 0) - new Date(a.reviewedAt || a.eventTime || 0));

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
      message: "Saved prediction reviews plus auto MVP calendar reviews."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load reviews", error: error.message });
  }
}

export async function reviewSummary(req, res) {
  try {
    const seededReviews = await getReviews();
    const autoReviews = await buildCompletedEventReviews();
    const reviews = dedupeReviews([...seededReviews, ...autoReviews]);
    const avgAccuracy = reviews.length
      ? Math.round(reviews.reduce((sum, review) => sum + Number(review.accuracyPct || 0), 0) / reviews.length)
      : 0;

    const byAsset = reviews.reduce((acc, review) => {
      const asset = review.assetSymbol || "UNKNOWN";
      if (!acc[asset]) acc[asset] = { count: 0, avgAccuracyPct: 0, total: 0 };
      acc[asset].count += 1;
      acc[asset].total += Number(review.accuracyPct || 0);
      acc[asset].avgAccuracyPct = Math.round(acc[asset].total / acc[asset].count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalReviews: reviews.length,
        averageAccuracyPct: avgAccuracy,
        byAsset,
        message: "Review summary includes saved prediction lifecycle reviews and MVP calendar examples."
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load review summary", error: error.message });
  }
}

export async function runReviews(req, res) {
  try {
    const result = await runReviewWorker();
    res.json({
      success: true,
      data: result,
      message: "Review worker completed. Ready predictions were marked reviewed and saved to mock_reviews.json."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to run review worker", error: error.message });
  }
}
