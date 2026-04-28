function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function roundMove(value) {
  return Number(clamp(value, -12, 12).toFixed(2));
}

function riskFromVolatility(volatility = "medium", importance = "medium") {
  const text = `${volatility} ${importance}`.toLowerCase();
  if (text.includes("critical") || text.includes("high")) return "Risky";
  if (text.includes("low")) return "Safe";
  return "Watch";
}

function directionalMoveForEvent(event = {}, symbol = "") {
  const title = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  const category = String(event.category || "").toLowerCase();
  const s = String(symbol || "").toUpperCase();

  if (title.includes("cpi") || title.includes("inflation") || category.includes("macro")) {
    const map = { GOLD: -0.32, SILVER: -0.28, BTC: -0.44, ETH: -0.51, SPY: -0.21, QQQ: -0.29, OIL: 0.18, NVDA: -0.38 };
    return map[s] ?? -0.18;
  }

  if (title.includes("fomc") || title.includes("fed") || title.includes("interest rate") || category.includes("central_bank")) {
    const map = { BTC: 0.62, ETH: 0.58, GOLD: 0.24, SILVER: 0.21, SPY: 0.38, QQQ: 0.46, NVDA: 0.55, OIL: 0.12 };
    return map[s] ?? 0.24;
  }

  if (title.includes("opec") || title.includes("inventory") || title.includes("eia") || category.includes("energy")) {
    const map = { OIL: 0.86, SPY: -0.12, QQQ: -0.16, GOLD: 0.18, BTC: -0.10, ETH: -0.12 };
    return map[s] ?? 0.15;
  }

  if (title.includes("etf") || title.includes("sec") || category.includes("crypto")) {
    const map = { BTC: 0.74, ETH: 0.59, SPY: 0.11, QQQ: 0.13, GOLD: -0.08 };
    return map[s] ?? 0.16;
  }

  if (title.includes("earnings") || category.includes("earnings")) {
    const map = { NVDA: 1.25, QQQ: 0.42, SPY: 0.22, BTC: 0.10, ETH: 0.09 };
    return map[s] ?? 0.20;
  }

  if (title.includes("war") || title.includes("sanction") || title.includes("middle east") || title.includes("shipping") || category.includes("geopolitical")) {
    const map = { OIL: 0.92, GOLD: 0.54, SILVER: 0.31, SPY: -0.28, QQQ: -0.34, BTC: -0.22, ETH: -0.25, NVDA: -0.48 };
    return map[s] ?? -0.14;
  }

  return 0.12;
}

function directionFromMove(move) {
  if (move > 0.05) return "up";
  if (move < -0.05) return "down";
  return "flat";
}

function buildMainPrediction(symbol, expectedMovePct, riskLevel, confidence) {
  const cleanMove = roundMove(expectedMovePct);
  const moveText = `${cleanMove > 0 ? "+" : ""}${cleanMove.toFixed(2)}%`;
  const cleanConfidence = Math.round(clamp(confidence, 0, 100));

  return {
    assetSymbol: String(symbol || "ASSET").toUpperCase(),
    expectedMovePct: cleanMove,
    direction: directionFromMove(cleanMove),
    riskLevel,
    confidence: cleanConfidence,
    text: `${String(symbol || "ASSET").toUpperCase()}: ${moveText}, ${riskLevel}, ${cleanConfidence}% sure`
  };
}

export function classifyImpact(event = {}, asset = {}) {
  const title = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  const category = String(event.category || "").toLowerCase();
  const symbol = String(asset.symbol || asset || "").toUpperCase();

  let label = "uncertain";
  let confidence = 55;
  let volatility = "medium";
  const reasons = [];

  if (title.includes("cpi") || title.includes("inflation") || category.includes("macro")) {
    volatility = "high";
    reasons.push("Inflation and macro releases usually move rates, USD expectations, equities, metals, and crypto risk appetite.");
    if (["GOLD", "SILVER", "BTC", "ETH", "SPY", "QQQ", "NVDA"].includes(symbol)) {
      label = "volatile";
      confidence = symbol === "GOLD" ? 78 : 72;
    }
  }

  if (title.includes("fomc") || title.includes("fed") || title.includes("interest rate") || category.includes("central_bank")) {
    volatility = "high";
    reasons.push("Central bank decisions can cause fast repricing in yields, USD, stocks, gold, and crypto.");
    label = "volatile";
    confidence = Math.max(confidence, symbol === "BTC" ? 76 : 74);
  }

  if (title.includes("opec") || title.includes("inventory") || title.includes("eia") || category.includes("energy")) {
    volatility = "high";
    reasons.push("Energy supply and inventory headlines directly affect oil and can spill into inflation expectations.");
    if (symbol === "OIL") {
      label = "bullish_or_bearish_depending_on_surprise";
      confidence = 70;
    }
  }

  if (title.includes("etf") || title.includes("sec") || category.includes("crypto")) {
    volatility = "high";
    reasons.push("Crypto regulation and ETF headlines can shift institutional demand expectations quickly.");
    if (["BTC", "ETH"].includes(symbol)) {
      label = "volatile_to_bullish";
      confidence = symbol === "BTC" ? 77 : 73;
    }
  }

  if (title.includes("earnings") || category.includes("earnings")) {
    volatility = "medium-high";
    reasons.push("Earnings can reprice a stock based on results, guidance, margins, and AI/capex commentary.");
    if (["AAPL", "MSFT", "NVDA"].includes(symbol)) {
      label = "volatile";
      confidence = 68;
    }
  }

  if (title.includes("war") || title.includes("sanction") || title.includes("middle east") || title.includes("shipping") || category.includes("geopolitical")) {
    volatility = "high";
    reasons.push("Geopolitical risk can increase safe-haven demand and energy supply risk while pressuring broad risk appetite.");
    if (["GOLD", "OIL"].includes(symbol)) {
      label = "volatile_to_bullish";
      confidence = Math.max(confidence, symbol === "OIL" ? 74 : 72);
    }
    if (["BTC", "ETH", "SPY", "QQQ", "NVDA"].includes(symbol)) {
      label = "volatile";
      confidence = Math.max(confidence, 66);
    }
  }

  if (!reasons.length) {
    reasons.push("The event may affect sentiment, but there is not enough structured context for a strong directional call.");
  }

  const expectedMovePct = directionalMoveForEvent(event, symbol);
  const riskLevel = riskFromVolatility(volatility, event.importance);
  const mainPrediction = buildMainPrediction(symbol, expectedMovePct, riskLevel, confidence);

  return {
    label,
    confidence,
    volatility,
    expectedMovePct: mainPrediction.expectedMovePct,
    riskLevel,
    direction: mainPrediction.direction,
    mainPrediction,
    reasons,
    disclaimer: "Educational market intelligence only. This is not financial advice, not a buy/sell signal, and not a guaranteed prediction."
  };
}

export { buildMainPrediction, riskFromVolatility };
