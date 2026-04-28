import { API_KEYS } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";

const MOCK_SERIES = {
  CPIAUCSL: {
    id: "CPIAUCSL",
    title: "Consumer Price Index for All Urban Consumers",
    latestValue: 314.1,
    latestDate: "2026-03-01",
    interpretation: "Inflation data can affect Fed expectations, USD, gold, stocks, and crypto sentiment."
  },
  FEDFUNDS: {
    id: "FEDFUNDS",
    title: "Federal Funds Effective Rate",
    latestValue: 5.33,
    latestDate: "2026-03-01",
    interpretation: "Higher rates can pressure risk assets and non-yielding assets, while lower-rate expectations can support them."
  },
  UNRATE: {
    id: "UNRATE",
    title: "Unemployment Rate",
    latestValue: 4.0,
    latestDate: "2026-03-01",
    interpretation: "Labor market strength affects growth expectations and central bank policy."
  }
};

export async function getFredSeries(seriesId = "CPIAUCSL") {
  const normalized = String(seriesId).toUpperCase();

  if (!API_KEYS.FRED) {
    return {
      source: "mock",
      ...MOCK_SERIES[normalized] || MOCK_SERIES.CPIAUCSL,
      message: "FRED_API_KEY missing. Returned seeded macro value."
    };
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", normalized);
  url.searchParams.set("api_key", API_KEYS.FRED);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const result = await safeFetchJson(url.toString());
  const observation = result.data?.observations?.[0];

  if (!result.ok || !observation) {
    return {
      source: "mock_after_fred_failure",
      ...MOCK_SERIES[normalized] || MOCK_SERIES.CPIAUCSL,
      error: result.error
    };
  }

  return {
    source: "fred",
    id: normalized,
    title: MOCK_SERIES[normalized]?.title || normalized,
    latestValue: Number(observation.value),
    latestDate: observation.date,
    interpretation: MOCK_SERIES[normalized]?.interpretation || "Macro data can affect financial market expectations."
  };
}

export async function getMacroOverview() {
  const ids = ["CPIAUCSL", "FEDFUNDS", "UNRATE"];
  const items = [];

  for (const id of ids) {
    items.push(await getFredSeries(id));
  }

  return items;
}
