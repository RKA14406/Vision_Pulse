import { buildMainPrediction, classifyImpact } from "../utils/impactRules.js";
import { askGemini } from "./gemini.service.js";
import { findHistoricalMatches } from "./historical.service.js";

function buildGeminiPrompt({ event, asset, ruleImpact, historicalMatches }) {
  return `
You are VisionPulse AI, an educational financial market intelligence assistant.
Do NOT provide financial advice, trade signals, buy/sell commands, or guarantees.

Return a concise JSON object only with these keys:
label, confidence, volatility, expectedMovePct, riskLevel, summary, reasoning, historicalComparison, riskWarning.

Event:
${JSON.stringify(event, null, 2)}

Asset:
${JSON.stringify(asset, null, 2)}

Rule-based impact baseline:
${JSON.stringify(ruleImpact, null, 2)}

Historical matches:
${JSON.stringify(historicalMatches, null, 2)}

Requirements:
- label must be one of: bullish, bearish, volatile, uncertain, volatile_to_bullish, volatile_to_bearish, bullish_or_bearish_depending_on_surprise
- confidence must be 0-100
- expectedMovePct must be a rough event-window percentage estimate such as 0.62 or -0.32
- riskLevel must be one of: Safe, Watch, Risky
- reasoning must be an array of 3 short strings
- riskWarning must say educational only and not financial advice
- Never use buy/sell/guaranteed wording
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
    summary: parsed.summary || `${asset.name}: ${mainPrediction.text}. Event impact is probabilistic and depends on surprise, liquidity, and market context.`,
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : ruleImpact.reasons,
    historicalComparison: parsed.historicalComparison || historicalMatches[0]?.reactionSummary || "No strong historical match found in seeded MVP data.",
    riskWarning: parsed.riskWarning || ruleImpact.disclaimer,
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
