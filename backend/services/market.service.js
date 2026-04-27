import { API_KEYS } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";
import {
  getProviderSymbol,
  normalizeSymbol,
  isMetalSymbol,
  normalizeMetalSymbol,
  getMetalProviderSymbol
} from "../utils/assetMapper.js";
import { getAssets } from "./dataStore.service.js";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[$,%\s,]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function hasApiLimitMessage(data) {
  return Boolean(data?.Note || data?.Information || data?.Error || data?.["Error Message"]);
}

function pickFirstNumberFromKeys(object, keyHints = []) {
  if (!object || typeof object !== "object") return null;

  const stack = [object];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const lowerKey = key.toLowerCase();
      const keyMatches = keyHints.some((hint) => lowerKey.includes(hint));

      if (keyMatches) {
        const parsed = toNumber(value);
        if (parsed !== null) return parsed;
      }

      if (value && typeof value === "object") stack.push(value);
    }
  }

  return null;
}

function pickDateFromPayload(data) {
  const stack = [data];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes("time") || lowerKey.includes("date")) && typeof value === "string") {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }

      if (value && typeof value === "object") stack.push(value);
    }
  }

  return new Date().toISOString();
}

function latestHistoryPoint(data) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  const usableRows = rows
    .map((row) => ({
      date: row.date || row.timestamp || row.time,
      value: toNumber(row.value ?? row.price ?? row.close ?? row["close"])
    }))
    .filter((row) => row.date && row.value !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!usableRows.length) return null;

  const latest = usableRows[0];
  const previous = usableRows[1] || null;
  const changePct = previous?.value ? ((latest.value - previous.value) / previous.value) * 100 : null;

  return {
    price: latest.value,
    previousClose: previous?.value ?? null,
    changePct: changePct === null ? null : Number(changePct.toFixed(2)),
    timestamp: new Date(latest.date).toISOString()
  };
}

async function mockQuote(symbol, messageOverride = null) {
  const normalized = normalizeSymbol(symbol);
  const assets = await getAssets();
  const asset = assets.find((item) => item.symbol === normalized || item.symbol === normalizeMetalSymbol(normalized));

  if (!asset) {
    return {
      source: "mock",
      symbol: normalized,
      price: null,
      changePct: null,
      message: "Unknown symbol in local MVP data"
    };
  }

  return {
    source: "mock",
    symbol: asset.symbol,
    displaySymbol: asset.displaySymbol,
    name: asset.name,
    price: asset.mockPrice,
    changePct: asset.mockChangePct,
    sparkline: asset.sparkline,
    timestamp: new Date().toISOString(),
    message: messageOverride || "Mock price used. Add API keys for live/fresh provider data."
  };
}

async function alphaVantageMetalSpotQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const providerSymbol = getMetalProviderSymbol(normalized);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GOLD_SILVER_SPOT");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || hasApiLimitMessage(result.data)) return null;

  const price =
    pickFirstNumberFromKeys(result.data, ["price", "spot", "rate", "value", "close"]);

  if (price === null) return null;

  return {
    source: "alpha_vantage_metals_spot",
    symbol: normalized,
    providerSymbol,
    price,
    changePct: pickFirstNumberFromKeys(result.data, ["change percent", "change_pct", "change_pct", "percent"]),
    timestamp: pickDateFromPayload(result.data),
    message: "Gold/silver spot price loaded from Alpha Vantage GOLD_SILVER_SPOT."
  };
}

async function alphaVantageMetalHistoryQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const providerSymbol = getMetalProviderSymbol(normalized);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GOLD_SILVER_HISTORY");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("interval", "daily");
  url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || hasApiLimitMessage(result.data)) return null;

  const history = latestHistoryPoint(result.data);
  if (!history) return null;

  return {
    source: "alpha_vantage_metals_history",
    symbol: normalized,
    providerSymbol,
    ...history,
    message: "Gold/silver daily close loaded from Alpha Vantage GOLD_SILVER_HISTORY fallback."
  };
}

async function alphaVantageMetalsQuote(symbol) {
  const spot = await alphaVantageMetalSpotQuote(symbol);
  if (spot) return spot;

  const history = await alphaVantageMetalHistoryQuote(symbol);
  if (history) return history;

  return null;
}

async function alphaVantageQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeSymbol(symbol);
  if (isMetalSymbol(normalized)) {
    return alphaVantageMetalsQuote(normalized);
  }

  const providerSymbol = getProviderSymbol(normalized, "alpha");
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || hasApiLimitMessage(result.data)) return null;

  const quote = result.data?.["Global Quote"];
  if (!quote || Object.keys(quote).length === 0) return null;

  return {
    source: "alpha_vantage",
    symbol: normalized,
    providerSymbol,
    price: toNumber(quote["05. price"]),
    changePct: toNumber(String(quote["10. change percent"] || "").replace("%", "")),
    open: toNumber(quote["02. open"]),
    high: toNumber(quote["03. high"]),
    low: toNumber(quote["04. low"]),
    previousClose: toNumber(quote["08. previous close"]),
    timestamp: new Date().toISOString()
  };
}

async function finnhubQuote(symbol) {
  if (!API_KEYS.FINNHUB) return null;

  const normalized = normalizeSymbol(symbol);

  // Strict: do not use GLD/SLV proxy quotes for spot metals.
  // Gold/silver should come from Alpha Vantage GOLD_SILVER_SPOT, not Finnhub equity/ETF quote routes.
  if (isMetalSymbol(normalized)) return null;

  const providerSymbol = getProviderSymbol(normalized, "finnhub");
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("token", API_KEYS.FINNHUB);

  const result = await safeFetchJson(url.toString());
  if (!result.ok) return null;

  const data = result.data || {};
  if (!data.c) return null;

  return {
    source: "finnhub",
    symbol: normalized,
    providerSymbol,
    price: toNumber(data.c),
    change: toNumber(data.d),
    changePct: toNumber(data.dp),
    high: toNumber(data.h),
    low: toNumber(data.l),
    open: toNumber(data.o),
    previousClose: toNumber(data.pc),
    timestamp: new Date((data.t || Date.now() / 1000) * 1000).toISOString()
  };
}

export async function getQuote(symbol, provider = "auto") {
  const normalized = normalizeSymbol(symbol);
  const finalSymbol = isMetalSymbol(normalized) ? normalizeMetalSymbol(normalized) : normalized;

  if (isMetalSymbol(finalSymbol)) {
    return (
      (await alphaVantageMetalsQuote(finalSymbol)) ||
      (await mockQuote(finalSymbol, "Metal spot fallback. Alpha Vantage GOLD_SILVER_SPOT did not return usable data."))
    );
  }

  if (provider === "alpha") {
    return (await alphaVantageQuote(finalSymbol)) || (await mockQuote(finalSymbol));
  }

  if (provider === "finnhub") {
    return (await finnhubQuote(finalSymbol)) || (await mockQuote(finalSymbol));
  }

  return (
    (await finnhubQuote(finalSymbol)) ||
    (await alphaVantageQuote(finalSymbol)) ||
    (await mockQuote(finalSymbol))
  );
}

export async function getQuotes(symbols = []) {
  const unique = [...new Set(symbols.map((symbol) => {
    const normalized = normalizeSymbol(symbol);
    return isMetalSymbol(normalized) ? normalizeMetalSymbol(normalized) : normalized;
  }).filter(Boolean))];

  const quotes = [];
  for (const symbol of unique) {
    quotes.push(await getQuote(symbol));
  }

  return quotes;
}
