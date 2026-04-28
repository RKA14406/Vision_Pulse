import { buildMainPrediction, classifyImpact } from "../utils/impactRules.js";
import { askGemini } from "./gemini.service.js";
import { findHistoricalMatches } from "./historical.service.js";

function buildGeminiPrompt({ event, asset, ruleImpact, historicalMatches }) {
  return `
You are VisionPulse AI, an educational financial market intelligence assistant.
Do NOT provide financial advice, trade signals, buy/sell commands, or guarantees.

Return JSON only. No markdown. No prose outside JSON.

Required keys:
label, confidence, volatility, expectedMovePct, riskLevel, summary, reasoning, historicalComparison, riskWarning.

Rules:
- label: bullish, bearish, volatile, uncertain, volatile_to_bullish, volatile_to_bearish, bullish_or_bearish_depending_on_surprise
- confidence: number 0-100
- expectedMovePct: event-window percentage estimate such as 0.62 or -0.32
- riskLevel: Safe, Watch, or Risky
- summary: max 18 words
- reasoning: exactly 2 short strings, max 16 words each
- historicalComparison: max 18 words
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
  const cleaned = text.replace(/```json|```/g, "").trim();
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

function normalizeRiskLevel(value, fallback = "Watch") {
  const text = String(value || "").toLowerCase();
  if (text.includes("safe") || text.includes("low")) return "Safe";
  if (text.includes("risk") || text.includes("high") || text.includes("critical")) return "Risky";
  if (text.includes("watch") || text.includes("medium")) return "Watch";
  return fallback;
}

function normalizePredictionPayload({ event, asset, source, parsed = {}, ruleImpact, historicalMatches, aiNote }) {
  const confidence = Math.round(clamp(parsed.confidence ?? ruleImpact.confidence, 0, 100));
  const expectedMovePct = Number(clamp(parsed.expectedMovePct ?? ruleImpact.expectedMovePct, -12, 12).toFixed(2));
  const riskLevel = normalizeRiskLevel(parsed.riskLevel, ruleImpact.riskLevel);
  const mainPrediction = buildMainPrediction(asset.symbol, expectedMovePct, riskLevel, confidence);

  return {
    source,
    id: `${source.includes("gemini") ? "pred_live" : "pred_rule"}_${Date.now()}`,
    eventId: event.id,
    assetSymbol: asset.symbol,
    label: parsed.label || ruleImpact.label,
    confidence,
    volatility: parsed.volatility || ruleImpact.volatility,
    expectedMovePct: mainPrediction.expectedMovePct,
    riskLevel: mainPrediction.riskLevel,
    direction: mainPrediction.direction,
    mainPrediction,
    summary: parsed.summary || `${asset.name}: ${mainPrediction.text}. Depends on surprise, liquidity, and market context.`,
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.slice(0, 2) : ruleImpact.reasons.slice(0, 2),
    historicalComparison: parsed.historicalComparison || historicalMatches[0]?.reactionSummary || "No strong historical match found in seeded MVP data.",
    riskWarning: parsed.riskWarning || "Educational only. Not financial advice. Not a buy/sell signal.",
    historicalMatches,
    generatedAt: new Date().toISOString(),
    aiNote
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
    historicalMatches,
    aiNote: gemini.text
  });
}
