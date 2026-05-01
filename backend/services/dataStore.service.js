import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

export async function readJson(fileName, fallback = []) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeJson(fileName, fallback);
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeDirection(raw = {}, expectedMovePct = 0) {
  const label = String(raw.label || raw.directionLabel || "").toLowerCase();
  const direction = String(raw.direction || "").toLowerCase();

  if (label.includes("bearish") || direction === "bearish" || direction === "down") return "bearish";
  if (label.includes("bullish") || direction === "bullish" || direction === "up") return "bullish";
  return Number(expectedMovePct) < 0 ? "bearish" : "bullish";
}

function normalizeReasoning(reasoning) {
  if (Array.isArray(reasoning)) {
    return reasoning.map((item) => String(item).trim()).filter(Boolean).slice(0, 4);
  }
  if (typeof reasoning === "string" && reasoning.trim()) return [reasoning.trim()];
  return ["Market reaction depends on surprise, liquidity, and current context."];
}

export function normalizePrediction(raw = {}) {
  const rawConf = Number(raw.confidencePct ?? raw.confidence ?? 0);
  const confidencePct = Math.round(rawConf <= 1 ? rawConf * 100 : rawConf);
  const confidence = Number((clamp(confidencePct, 0, 100, 0) / 100).toFixed(4));

  const expectedMovePct = Number(clamp(
    raw.expectedMovePct ?? raw.mainPrediction?.expectedMovePct ?? 0,
    -12,
    12,
    0
  ).toFixed(2));

  const asset = String(
    raw.asset ||
    raw.assetSymbol ||
    raw.mainPrediction?.assetSymbol ||
    "UNKNOWN"
  ).toUpperCase();

  const direction = normalizeDirection(raw, expectedMovePct);
  const riskLevel = String(raw.riskLevel || raw.mainPrediction?.riskLevel || "Watch");
  const volatility = String(raw.volatility || "medium");
  const eventTitle = String(raw.eventTitle || raw.event?.title || "Selected market event");

  const mainPrediction = String(
    raw.mainPrediction?.text ||
    raw.mainPrediction ||
    `${asset}: ${expectedMovePct > 0 ? "+" : ""}${expectedMovePct.toFixed(2)}%, ${riskLevel}, ${confidencePct}% confidence`
  );

  const summary = String(
    raw.summary ||
    raw.prediction ||
    `${asset}: ${direction} bias. Depends on surprise, liquidity, and market context.`
  );

  return {
    id: String(raw.id || `${raw.source?.includes?.("gemini") ? "pred_live" : "pred_rule"}_${Date.now()}`),
    eventId: String(raw.eventId || ""),
    asset,
    eventTitle,
    mainPrediction,
    summary,
    prediction: summary,
    confidence,
    confidencePct: clamp(confidencePct, 0, 100, 0),
    direction,
    expectedMovePct,
    riskLevel,
    volatility,
    reasoning: normalizeReasoning(raw.reasoning),
    historicalComparison: String(raw.historicalComparison || "No historical comparison attached yet."),
    riskWarning: String(raw.riskWarning || "Educational only. Not financial advice. Not a buy/sell signal."),
    status: String(raw.status || "pending"),
    source: String(raw.source || "rules_only"),
    createdAt: raw.createdAt || raw.generatedAt || new Date().toISOString(),
    reviewedAt: raw.reviewedAt || null,
    reviewId: raw.reviewId || null
  };
}

export async function getAssets() {
  return readJson("assets.json", []);
}

export async function getEvents() {
  return readJson("events.json", []);
}

export async function getPredictions() {
  const predictions = await readJson("predictions.json", []);
  return Array.isArray(predictions) ? predictions.map(normalizePrediction) : [];
}

export async function getReviews() {
  return readJson("mock_reviews.json", []);
}

export async function getHistoricalMatches() {
  return readJson("historical_matches.json", []);
}

export async function savePrediction(rawPrediction) {
  const normalized = normalizePrediction(rawPrediction);
  let predictions = await getPredictions();

  const duplicate = predictions.find((p) =>
    p.eventId === normalized.eventId &&
    p.asset === normalized.asset &&
    p.status === normalized.status &&
    Math.abs(new Date(p.createdAt).getTime() - new Date(normalized.createdAt).getTime()) < 5000
  );

  if (duplicate) return duplicate;

  predictions.push(normalized);

  if (predictions.length > 250) {
    predictions = predictions.slice(-250);
  }

  await writeJson("predictions.json", predictions);
  return normalized;
}

export async function updatePrediction(predictionId, patch = {}) {
  const predictions = await getPredictions();
  const index = predictions.findIndex((item) => String(item.id) === String(predictionId));

  if (index === -1) return null;

  predictions[index] = normalizePrediction({
    ...predictions[index],
    ...patch,
    id: predictions[index].id,
    createdAt: predictions[index].createdAt
  });

  await writeJson("predictions.json", predictions);
  return predictions[index];
}

export async function saveReview(review = {}) {
  const reviews = await getReviews();
  const id = String(review.id || `review_${review.predictionId || Date.now()}`);

  const normalized = {
    id,
    predictionId: String(review.predictionId || ""),
    eventId: String(review.eventId || ""),
    eventTitle: String(review.eventTitle || "Selected market event"),
    assetSymbol: String(review.assetSymbol || review.asset || "UNKNOWN").toUpperCase(),
    predictedLabel: String(review.predictedLabel || review.direction || "uncertain"),
    actualDirection: String(review.actualDirection || "unknown"),
    actualChangePct: Number(clamp(review.actualChangePct, -25, 25, 0).toFixed(2)),
    peakToTroughPct: Number(clamp(review.peakToTroughPct, 0, 50, 0).toFixed(2)),
    accuracyPct: Math.round(clamp(review.accuracyPct, 0, 100, 0)),
    scoreBreakdown: review.scoreBreakdown || {
      direction: 0,
      volatility: 0,
      confidence: 0,
      explanation: 0
    },
    lesson: String(review.lesson || "Review generated from MVP post-event scoring logic."),
    reviewType: String(review.reviewType || "Auto MVP review"),
    source: String(review.source || "VisionPulse review worker"),
    eventTime: review.eventTime || null,
    createdAt: review.createdAt || new Date().toISOString()
  };

  const existingIndex = reviews.findIndex((item) =>
    String(item.id) === normalized.id ||
    (normalized.predictionId && String(item.predictionId) === normalized.predictionId)
  );

  if (existingIndex >= 0) {
    reviews[existingIndex] = { ...reviews[existingIndex], ...normalized };
  } else {
    reviews.push(normalized);
  }

  await writeJson("mock_reviews.json", reviews);
  return normalized;
}

export async function saveReviews(newReviews = []) {
  const saved = [];
  for (const review of newReviews) {
    saved.push(await saveReview(review));
  }
  return saved;
}
