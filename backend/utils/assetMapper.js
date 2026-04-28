const SYMBOL_MAP = {
  GOLD: {
    alpha: "GOLD",
    alphaMetal: "GOLD",
    finnhub: null,
    label: "Gold spot"
  },
  SILVER: {
    alpha: "SILVER",
    alphaMetal: "SILVER",
    finnhub: null,
    label: "Silver spot"
  },
  BTC: { alpha: "BTCUSD", finnhub: "BINANCE:BTCUSDT", label: "Bitcoin" },
  ETH: { alpha: "ETHUSD", finnhub: "BINANCE:ETHUSDT", label: "Ethereum" },
  OIL: { alpha: "USO", finnhub: "USO", label: "Oil proxy ETF" },
  SPY: { alpha: "SPY", finnhub: "SPY", label: "S&P 500 ETF" },
  QQQ: { alpha: "QQQ", finnhub: "QQQ", label: "Nasdaq 100 ETF" },
  AAPL: { alpha: "AAPL", finnhub: "AAPL", label: "Apple" },
  MSFT: { alpha: "MSFT", finnhub: "MSFT", label: "Microsoft" },
  NVDA: { alpha: "NVDA", finnhub: "NVDA", label: "Nvidia" }
};

export function normalizeSymbol(symbol = "") {
  return String(symbol).trim().toUpperCase();
}

export function isMetalSymbol(symbol = "") {
  return ["GOLD", "SILVER", "XAU", "XAG"].includes(normalizeSymbol(symbol));
}

export function normalizeMetalSymbol(symbol = "") {
  const normalized = normalizeSymbol(symbol);
  if (normalized === "XAU") return "GOLD";
  if (normalized === "XAG") return "SILVER";
  return normalized;
}

export function getProviderSymbol(symbol, provider = "alpha") {
  const normalized = normalizeSymbol(symbol);
  const item = SYMBOL_MAP[normalized];
  if (!item) return normalized;
  return item[provider] || normalized;
}

export function getMetalProviderSymbol(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  const item = SYMBOL_MAP[normalized];
  return item?.alphaMetal || normalized;
}

export function symbolInfo(symbol) {
  return SYMBOL_MAP[normalizeSymbol(symbol)] || null;
}
