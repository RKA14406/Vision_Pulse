import { API_KEYS } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";

const MOCK_OIL = {
  source: "mock",
  title: "Oil / Energy Risk Snapshot",
  latestValue: 81.2,
  unit: "USD/bbl proxy",
  trend: "upward risk bias",
  interpretation: "Oil can react to OPEC guidance, EIA inventory surprises, sanctions, shipping risks, and demand outlook changes."
};

export async function getOilSnapshot() {
  if (!API_KEYS.EIA) {
    return {
      ...MOCK_OIL,
      message: "EIA_API_KEY missing. Returned seeded energy snapshot."
    };
  }

  const url = new URL("https://api.eia.gov/v2/petroleum/pri/spt/data/");
  url.searchParams.set("api_key", API_KEYS.EIA);
  url.searchParams.set("frequency", "daily");
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", "1");

  const result = await safeFetchJson(url.toString());
  const row = result.data?.response?.data?.[0];

  if (!result.ok || !row) {
    return {
      ...MOCK_OIL,
      source: "mock_after_eia_failure",
      error: result.error
    };
  }

  return {
    source: "eia",
    title: "EIA Petroleum Spot Price Snapshot",
    latestValue: Number(row.value),
    latestDate: row.period,
    unit: row.units || "USD/bbl",
    series: row.series || row.product || "petroleum",
    interpretation: MOCK_OIL.interpretation
  };
}
