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
    .filter((row) => row.date && row.value !== null && row.value > 0)
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

async function fetchPlainText(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "text/csv,text/plain,*/*",
        "User-Agent": "VisionPulseAI-MVP/1.0"
      }
    });
    const text = await response.text();
    if (!response.ok) return { ok: false, status: response.status, error: `HTTP ${response.status}`, text };
    return { ok: true, status: response.status, text };
  } catch (error) {
    return { ok: false, status: 0, error: error.name === "AbortError" ? "Request timed out" : error.message, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function metalSpotDemoBackupQuote(symbol, messageOverride = null) {
  const normalized = normalizeMetalSymbol(symbol);
  const fallback = await mockQuote(normalized);
  return {
    ...fallback,
    source: "metal_spot_demo_backup",
    symbol: normalized,
    providerSymbol: normalized === "SILVER" ? "XAG/USD" : "XAU/USD",
    message: messageOverride || "Transparent demo spot backup used after all live metal routes failed. Not a live quote."
  };
}

function metalSymbolsForProvider(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  if (normalized === "GOLD") return ["GOLD", "XAU"];
  if (normalized === "SILVER") return ["SILVER", "XAG"];
  return [getMetalProviderSymbol(normalized), normalized];
}

function metalCurrencyCode(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  if (normalized === "GOLD") return "XAU";
  if (normalized === "SILVER") return "XAG";
  return normalized;
}

function alphaCommodityFunction(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  if (normalized === "GOLD") return "GOLD";
  if (normalized === "SILVER") return "SILVER";
  return normalized;
}

async function alphaVantageMetalSpotQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const providerSymbols = [...new Set(metalSymbolsForProvider(normalized).filter(Boolean))];

  for (const providerSymbol of providerSymbols) {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "GOLD_SILVER_SPOT");
    url.searchParams.set("symbol", providerSymbol);
    url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

    const result = await safeFetchJson(url.toString());
    if (!result.ok || hasApiLimitMessage(result.data)) continue;

    const price = pickFirstNumberFromKeys(result.data, ["price", "spot", "rate", "value", "close"]);
    if (price === null || price <= 0) continue;

    return {
      source: "alpha_vantage_metals_spot",
      symbol: normalized,
      providerSymbol,
      price,
      changePct: pickFirstNumberFromKeys(result.data, ["change percent", "change_pct", "change", "percent"]),
      timestamp: pickDateFromPayload(result.data),
      message: `${normalized === "SILVER" ? "Silver" : "Gold"} spot price loaded from Alpha Vantage GOLD_SILVER_SPOT.`
    };
  }

  return null;
}

async function alphaVantageMetalCurrencyQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const fromCurrency = metalCurrencyCode(normalized);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "REALTIME_CURRENCY_EXCHANGE_RATE");
  url.searchParams.set("from_currency", fromCurrency);
  url.searchParams.set("to_currency", "USD");
  url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || hasApiLimitMessage(result.data)) return null;

  const payload = result.data?.["Realtime Currency Exchange Rate"] || result.data;
  const price =
    toNumber(payload?.["5. Exchange Rate"]) ||
    pickFirstNumberFromKeys(payload, ["exchange rate", "price", "rate", "value"]);

  if (price === null || price <= 0) return null;

  return {
    source: "alpha_vantage_metals_fx",
    symbol: normalized,
    providerSymbol: `${fromCurrency}/USD`,
    price,
    changePct: null,
    timestamp: pickDateFromPayload(payload),
    message: `${normalized === "SILVER" ? "Silver" : "Gold"} spot fallback loaded through Alpha Vantage currency exchange route.`
  };
}

async function alphaVantageMetalHistoryQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const providerSymbols = [...new Set(metalSymbolsForProvider(normalized).filter(Boolean))];

  for (const providerSymbol of providerSymbols) {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "GOLD_SILVER_HISTORY");
    url.searchParams.set("symbol", providerSymbol);
    url.searchParams.set("interval", "daily");
    url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

    const result = await safeFetchJson(url.toString());
    if (!result.ok || hasApiLimitMessage(result.data)) continue;

    const history = latestHistoryPoint(result.data);
    if (!history) continue;

    return {
      source: "alpha_vantage_metals_history",
      symbol: normalized,
      providerSymbol,
      ...history,
      message: `${normalized === "SILVER" ? "Silver" : "Gold"} daily close loaded from Alpha Vantage GOLD_SILVER_HISTORY fallback.`
    };
  }

  return null;
}

async function alphaVantageCommodityQuote(symbol) {
  if (!API_KEYS.ALPHA_VANTAGE) return null;

  const normalized = normalizeMetalSymbol(symbol);
  const functionName = alphaCommodityFunction(normalized);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", functionName);
  url.searchParams.set("interval", "daily");
  url.searchParams.set("apikey", API_KEYS.ALPHA_VANTAGE);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || hasApiLimitMessage(result.data)) return null;

  const history = latestHistoryPoint(result.data);
  if (!history) return null;

  return {
    source: "alpha_vantage_commodity",
    symbol: normalized,
    providerSymbol: functionName,
    ...history,
    message: `${normalized === "SILVER" ? "Silver" : "Gold"} commodity series loaded from Alpha Vantage commodity route.`
  };
}

function stooqSymbolForMetal(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  if (normalized === "GOLD") return "xauusd";
  if (normalized === "SILVER") return "xagusd";
  return null;
}

function parseStooqCsv(raw = "") {
  const lines = String(raw).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const values = lines[1].split(",").map((item) => item.trim());
  const row = {};

  headers.forEach((header, index) => {
    row[header] = values[index];
  });

  const close = toNumber(row.close || row.c);
  const open = toNumber(row.open || row.o);
  if (close === null || close <= 0) return null;

  const dateText = row.date || row.d2;
  const timeText = row.time || row.t2 || "00:00:00";
  const isoCandidate = dateText ? `${dateText}T${timeText}` : null;
  const parsedDate = isoCandidate ? new Date(isoCandidate) : new Date();
  const timestamp = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
  const changePct = open ? ((close - open) / open) * 100 : null;

  return {
    price: close,
    open,
    high: toNumber(row.high || row.h),
    low: toNumber(row.low || row.l),
    previousClose: open,
    changePct: changePct === null ? null : Number(changePct.toFixed(2)),
    timestamp
  };
}

async function stooqMetalQuote(symbol) {
  const normalized = normalizeMetalSymbol(symbol);
  const providerSymbol = stooqSymbolForMetal(normalized);
  if (!providerSymbol) return null;

  const url = new URL("https://stooq.com/q/l/");
  url.searchParams.set("s", providerSymbol);
  url.searchParams.set("f", "sd2t2ohlcv");
  url.searchParams.set("h", "");
  url.searchParams.set("e", "csv");

  const result = await fetchPlainText(url.toString(), 8000);
  if (!result.ok) return null;

  const parsed = parseStooqCsv(result.text);
  if (!parsed) return null;

  return {
    source: "stooq_metals_spot_backup",
    symbol: normalized,
    providerSymbol: providerSymbol.toUpperCase(),
    ...parsed,
    message: `${normalized === "SILVER" ? "Silver" : "Gold"} spot loaded from no-key XAU/XAG USD backup because Alpha Vantage did not return usable metal data.`
  };
}

async function alphaVantageMetalsQuote(symbol) {
  const spot = await alphaVantageMetalSpotQuote(symbol);
  if (spot) return spot;

  const currency = await alphaVantageMetalCurrencyQuote(symbol);
  if (currency) return currency;

  const history = await alphaVantageMetalHistoryQuote(symbol);
  if (history) return history;

  const commodity = await alphaVantageCommodityQuote(symbol);
  if (commodity) return commodity;

  const stooq = await stooqMetalQuote(symbol);
  if (stooq) return stooq;

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

  const price = toNumber(quote["05. price"]);
  if (price === null || price <= 0) return null;

  return {
    source: "alpha_vantage",
    symbol: normalized,
    providerSymbol,
    price,
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
  if (!data.c || Number(data.c) <= 0) return null;

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
      (await metalSpotDemoBackupQuote(finalSymbol, "Metal spot fallback. Tried Alpha Vantage spot, XAU/XAG, currency, history, commodity, and no-key XAU/XAG USD backup routes but no usable live metal data returned."))
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
