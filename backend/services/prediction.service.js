import { classifyImpact } from "../utils/impactRules.js";
import { askGemini } from "./gemini.service.js";
import { findHistoricalMatches } from "./historical.service.js";

const ALLOWED_LABELS = new Set([
  "bullish",
  "bearish",
  "volatile",
  "uncertain",
  "volatile_to_bullish",
  "volatile_to_bearish",
  "bullish_or_bearish_depending_on_surprise"
]);

const ALLOWED_RISK_LEVELS = new Set(["Safe", "Watch", "Risky"]);
const ALLOWED_VOLATILITY = new Set(["low", "medium", "medium-high", "high", "critical"]);

function buildGeminiPrompt({ event, asset, ruleImpact, historicalMatches }) {
  return `
You are VisionPulse AI, an educational financial market intelligence assistant.
Do NOT provide financial advice, trade signals, buy/sell commands, or guarantees.

Return JSON only. No markdown. No prose outside JSON.

Required keys:
label, confidence, volatility, expectedMovePct, riskLevel, summary, reasoning, historicalComparison, riskWarning.

Rules:
- label must be one of: bullish, bearish, volatile, uncertain, volatile_to_bullish, volatile_to_bearish, bullish_or_bearish_depending_on_surprise
- confidence: number from 0 to 100
- volatility: low, medium, medium-high, high, or critical
- expectedMovePct: estimated event-window move, e.g. 0.62 or -0.32
- riskLevel: Safe, Watch, or Risky
- summary: max 22 words
- reasoning: exactly 2 short strings, max 18 words each
- historicalComparison: max 24 words
- riskWarning: "Educational only. Not financial advice. Not a buy/sell signal."

Event:
${JSON.stringify(event, null, 2)}

Asset:
${JSON.stringify(asset, null, 2)}

Rule baseline:
${JSON.stringify(ruleImpact, null, 2)}

Historical matches:
${JSON.stringify(historicalMatches, null, 2)}
`.trim();
}

function parseGeminiJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function roundMove(value) {
  return Number(clamp(value, -12, 12).toFixed(2));
}

function sanitizeLabel(value, fallback = "uncertain") {
  const clean = String(value || "").trim().toLowerCase();
  return ALLOWED_LABELS.has(clean) ? clean : fallback;
}

function sanitizeRiskLevel(value, fallback = "Watch") {
  const clean = String(value || "").trim();
  if (ALLOWED_RISK_LEVELS.has(clean)) return clean;

  const lower = clean.toLowerCase();
  if (lower.includes("safe")) return "Safe";
  if (lower.includes("risk")) return "Risky";
  return fallback;
}

function sanitizeVolatility(value, fallback = "medium") {
  const clean = String(value || "").trim().toLowerCase();
  return ALLOWED_VOLATILITY.has(clean) ? clean : fallback;
}

function resolveDirection(label, ruleDirection, expectedMovePct) {
  const l = String(label || "").toLowerCase();
  const d = String(ruleDirection || "").toLowerCase();

  if (l.includes("bearish") || d === "bearish" || d === "down") return "bearish";
  if (l.includes("bullish") || d === "bullish" || d === "up") return "bullish";
  return Number(expectedMovePct) >= 0 ? "bullish" : "bearish";
}

function normalizeReasoning(value, ruleImpact = {}, event = {}) {
  const output = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const text = String(item || "").trim();
      if (text) output.push(text);
    });
  } else if (typeof value === "string" && value.trim()) {
    output.push(value.trim());
  }

  if (!output.length && Array.isArray(ruleImpact.reasons)) {
    ruleImpact.reasons.slice(0, 2).forEach((reason) => output.push(String(reason).trim()));
  }

  if (!output.length) {
    output.push("Market reaction depends on surprise versus expectations.");
    output.push(`${event.category || "Event"} context may affect liquidity, volatility, and sentiment.`);
  }

  return output
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => item.length > 130 ? `${item.slice(0, 127).trim()}…` : item);
}

function buildHistoricalComparison(parsed = {}, historicalMatches = []) {
  const parsedText = String(parsed.historicalComparison || "").trim();
  if (parsedText) return parsedText;

  const top = historicalMatches?.[0];
  if (!top) return "No close historical match found in the MVP dataset.";

  const summary = top.reactionSummary || top.similarEvent || "Similar historical event found.";
  const range = top.reactionRangePct ? ` Range: ${top.reactionRangePct}.` : "";
  return `${summary}${range}`;
}

function formatMove(move) {
  const n = roundMove(move);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function buildMainPrediction(assetSymbol, expectedMovePct, riskLevel, confidencePct) {
  return `${assetSymbol}: ${formatMove(expectedMovePct)}, ${riskLevel}, ${confidencePct}% confidence`;
}

function normalizePredictionPayload({ event, asset, source, parsed = {}, ruleImpact, historicalMatches }) {
  const fallbackLabel = sanitizeLabel(ruleImpact.label, "uncertain");
  const label = sanitizeLabel(parsed.label, fallbackLabel);

  const rawConfidence = clamp(parsed.confidence ?? ruleImpact.confidence ?? 55, 0, 100);
  const confidencePct = Math.round(rawConfidence);
  const confidence = parseFloat((confidencePct / 100).toFixed(4));

  const expectedMovePct = roundMove(parsed.expectedMovePct ?? ruleImpact.expectedMovePct ?? 0);
  const direction = resolveDirection(label, ruleImpact.direction, expectedMovePct);
  const volatility = sanitizeVolatility(parsed.volatility, sanitizeVolatility(ruleImpact.volatility, "medium"));
  const riskLevel = sanitizeRiskLevel(parsed.riskLevel, ruleImpact.riskLevel || "Watch");

  const assetSymbol = String(asset.symbol || "ASSET").toUpperCase();
  const eventTitle = event.title || "Selected market event";
  const summary = String(
    parsed.summary ||
    `${asset.name || assetSymbol}: ${direction} bias. Expected move ${formatMove(expectedMovePct)} during the event window.`
  ).trim();

  const reasoning = normalizeReasoning(parsed.reasoning, ruleImpact, event);
  const historicalComparison = buildHistoricalComparison(parsed, historicalMatches);
  const riskWarning = String(
    parsed.riskWarning ||
    ruleImpact.disclaimer ||
    "Educational only. Not financial advice. Not a buy/sell signal."
  ).trim();

  const mainPrediction = buildMainPrediction(assetSymbol, expectedMovePct, riskLevel, confidencePct);

  return {
    id: `${String(source || "rules").includes("gemini") ? "pred_live" : "pred_rule"}_${Date.now()}`,
    eventId: String(event.id || ""),
    eventTitle,
    asset: assetSymbol,
    assetName: asset.name || assetSymbol,

    // Legacy/frontend-safe fields
    prediction: summary,
    confidence,
    direction,
    status: "pending",
    source,
    createdAt: new Date().toISOString(),

    // Rich schema for professional cards/history
    schemaVersion: 2,
    label,
    mainPrediction,
    summary,
    confidencePct,
    expectedMovePct,
    volatility,
    riskLevel,
    reasoning,
    historicalComparison,
    historicalMatches: Array.isArray(historicalMatches) ? historicalMatches.slice(0, 3) : [],
    riskWarning,
    eventCategory: event.category || "unknown",
    eventTime: event.eventTime || event.publishedAt || null,
    isCustomNews: Boolean(event.isCustomNews),

    mainPredictionData: {
      assetSymbol,
      expectedMovePct,
      direction,
      riskLevel,
      confidence: confidencePct,
      text: mainPrediction
    }
  };
}

export async function generatePrediction({ event, asset }) {
  const ruleImpact = classifyImpact(event, asset);
  const historicalMatches = await findHistoricalMatches(event, asset.symbol);
  const prompt = buildGeminiPrompt({ event, asset, ruleImpact, historicalMatches });
  const gemini = await askGemini(prompt);
  const parsed = parseGeminiJson(gemini.text);

  if (parsed && gemini.usedGemini) {
    return normalizePredictionPayload({
      event,
      asset,
      source: "gemini_plus_rules",
      parsed,
      ruleImpact,
      historicalMatches
    });
  }

  return normalizePredictionPayload({
    event,
    asset,
    source: gemini.source || "rules_only",
    parsed: {},
    ruleImpact,
    historicalMatches
  });
}
