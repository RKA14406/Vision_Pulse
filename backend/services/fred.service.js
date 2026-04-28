const env = require("../config/env");

const BASE_URL = "https://api.stlouisfed.org/fred";

async function request(path, params = {}) {
  if (!env.fredApiKey) {
    throw new Error("FRED_API_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}${path}`);
  Object.entries({
    ...params,
    api_key: env.fredApiKey,
    file_type: "json",
  }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FRED request failed with ${response.status}`);
  }

  return response.json();
}

function getSeriesObservations(seriesId, options = {}) {
  return request("/series/observations", {
    series_id: seriesId,
    observation_start: options.startDate || "2020-01-01",
    sort_order: options.sortOrder || "desc",
    limit: options.limit || 12,
  });
}

module.exports = {
  getSeriesObservations,
};
