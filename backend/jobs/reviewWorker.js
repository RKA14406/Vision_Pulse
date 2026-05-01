import {
  getPredictions,
  getReviews,
  getEvents,
  saveReview,
  updatePrediction
} from "../services/dataStore.service.js";

function hashText(value = "") {
  return Math.abs(String(value).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0));
}

function deterministicMove(seed = "") {
  const hash = hashText(seed);
  const raw = ((hash % 280) - 140) / 100;
  const value = raw === 0 ? 0.12 : raw;
  return Number(value.toFixed(2));
}

function deterministicRange(seed = "") {
  const hash = hashText(`${seed}_range`);
  return Number((0.45 + (hash % 290) / 100).toFixed(2));
}

function directionFromMove(move) {
  if (move > 0.05) return "bullish";
  if (move < -0.05) return "bearish";
  return "flat";
}

function isPredictionReviewable(prediction = {}) {
  if (String(prediction.status || "pending").toLowerCase() === "reviewed") return false;

  const eventTime = new Date(prediction.eventTime || prediction.createdAt || Date.now());
  if (Number.isNaN(eventTime.getTime())) return false;

  const expectedHours = Number(prediction.expectedWindowHours || 6);
  const reviewReadyAt = eventTime.getTime() + expectedHours * 60 * 60 * 1000;
  return reviewReadyAt <= Date.now();
}

function eventTitleForPrediction(prediction, events) {
  return prediction.eventTitle || events.find((event) => event.id === prediction.eventId)?.title || prediction.eventId || "Market event";
}

function scorePrediction(prediction = {}, actualMove = 0, peakToTroughPct = 0) {
  const predictedDirection = String(prediction.direction || "").toLowerCase();
  const actualDirection = directionFromMove(actualMove);
  const expectedMove = Number(prediction.expectedMovePct || prediction.mainPredictionData?.expectedMovePct || 0);
  const expectedAbs = Math.abs(expectedMove);
  const actualAbs = Math.abs(actualMove);

  const directionScore = predictedDirection === actualDirection ? 45 : actualDirection === "flat" ? 20 : 10;
  const magnitudeGap = Math.abs(expectedAbs - actualAbs);
  const magnitudeScore = Math.max(0, 30 - Math.round(magnitudeGap * 9));
  const expectedVolatile = /high|risky|volatile/i.test(`${prediction.volatility || ""} ${prediction.riskLevel || ""} ${prediction.label || ""}`);
  const volatilityHit = expectedVolatile ? peakToTroughPct >= 0.8 : peakToTroughPct < 1.8;
  const volatilityScore = volatilityHit ? 20 : 8;
  const explanationScore = Array.isArray(prediction.reasoning) && prediction.reasoning.length ? 5 : 2;

  const accuracyPct = Math.max(0, Math.min(100, directionScore + magnitudeScore + volatilityScore + explanationScore));

  return {
    accuracyPct,
    predictedDirection,
    actualDirection,
    scoreBreakdown: {
      directionScore,
      magnitudeScore,
      volatilityScore,
      explanationScore
    }
  };
}

function buildReview(prediction, events) {
  const seed = `${prediction.id}_${prediction.eventId}_${prediction.asset}`;
  const actualChangePct = deterministicMove(seed);
  const peakToTroughPct = deterministicRange(seed);
  const score = scorePrediction(prediction, actualChangePct, peakToTroughPct);
  const eventTitle = eventTitleForPrediction(prediction, events);

  return {
    id: `review_${prediction.id}`,
    predictionId: prediction.id,
    eventTitle,
    assetSymbol: prediction.asset,
    predictedLabel: prediction.label || prediction.direction || "uncertain",
    predictedDirection: score.predictedDirection,
    actualDirection: score.actualDirection,
    actualChangePct,
    peakToTroughPct,
    accuracyPct: score.accuracyPct,
    eventTime: prediction.eventTime || prediction.createdAt,
    reviewedAt: new Date().toISOString(),
    reviewType: "Prediction lifecycle review",
    source: "VisionPulse review engine",
    scoreBreakdown: score.scoreBreakdown,
    lesson: `${eventTitle} moved ${actualChangePct > 0 ? "+" : ""}${actualChangePct.toFixed(2)}% for ${prediction.asset}. Direction, move size, and volatility were scored separately for accountability.`
  };
}

export async function runReviewWorker() {
  const [predictions, reviews, events] = await Promise.all([
    getPredictions(),
    getReviews(),
    getEvents()
  ]);

  const reviewedIds = new Set(reviews.map((review) => String(review.predictionId || "")).filter(Boolean));
  const created = [];
  const skipped = [];

  for (const prediction of predictions) {
    if (reviewedIds.has(String(prediction.id))) {
      skipped.push({ id: prediction.id, reason: "already_reviewed" });
      continue;
    }

    if (!isPredictionReviewable(prediction)) {
      skipped.push({ id: prediction.id, reason: "not_ready" });
      continue;
    }

    const review = buildReview(prediction, events);
    const savedReview = await saveReview(review);
    await updatePrediction(prediction.id, {
      status: "reviewed",
      reviewedAt: savedReview.reviewedAt,
      accuracyPct: savedReview.accuracyPct,
      reviewId: savedReview.id
    });
    created.push(savedReview);
  }

  return {
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
    ranAt: new Date().toISOString()
  };
}
