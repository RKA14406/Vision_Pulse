import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

export async function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function writeJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

export function normalizePrediction(raw) {
  const rawConf = Number(raw.confidence ?? 0);
  const confidence = parseFloat((rawConf > 1 ? rawConf / 100 : rawConf).toFixed(4));

  const label = String(raw.label || "").toLowerCase();
  const rawDir = String(raw.direction || "").toLowerCase();
  let direction;
  if (label.includes("bearish") || rawDir === "bearish" || rawDir === "down") {
    direction = "bearish";
  } else if (label.includes("bullish") || rawDir === "bullish" || rawDir === "up") {
    direction = "bullish";
  } else {
    const move = Number(raw.expectedMovePct ?? raw.mainPrediction?.expectedMovePct ?? 0);
    direction = move >= 0 ? "bullish" : "bearish";
  }

  return {
    id: String(raw.id || `pred_${Date.now()}`),
    eventId: String(raw.eventId || ""),
    asset: String(raw.asset || raw.assetSymbol || raw.mainPrediction?.assetSymbol || "UNKNOWN").toUpperCase(),
    prediction: String(raw.prediction || raw.summary || ""),
    confidence,
    direction,
    status: String(raw.status || "pending"),
    source: String(raw.source || "unknown"),
    createdAt: raw.createdAt || raw.generatedAt || new Date().toISOString()
  };
}

export async function getAssets() {
  return readJson("assets.json");
}

export async function getEvents() {
  return readJson("events.json");
}

export async function getPredictions() {
  return readJson("predictions.json");
}

export async function getReviews() {
  return readJson("mock_reviews.json");
}

export async function getHistoricalMatches() {
  return readJson("historical_matches.json");
}

export async function savePrediction(rawPrediction) {
  const normalized = normalizePrediction(rawPrediction);
  let predictions = await getPredictions();

  const now = Date.now();

  // 🔁 Deduplication: same event + asset within 60 seconds
  const exists = predictions.find(p =>
    p.eventId === normalized.eventId &&
    p.asset === normalized.asset &&
    (now - new Date(p.createdAt).getTime()) < 60000
  );

  if (exists) {
    return exists; // skip duplicate
  }

  // ➕ Add new prediction
  predictions.push(normalized);

  // 🧹 Keep only last 100 predictions (MVP safety)
  if (predictions.length > 100) {
    predictions = predictions.slice(-100);
  }

  await writeJson("predictions.json", predictions);
  return normalized;
}