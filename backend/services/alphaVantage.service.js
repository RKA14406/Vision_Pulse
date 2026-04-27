const env = require("../config/env");

const BASE_URL = "https://www.alphavantage.co/query";

async function request(params) {
  if (!env.alphaVantageApiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  }

  const url = new URL(BASE_URL);
  Object.entries({ ...params, apikey: env.alphaVantageApiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with ${response.status}`);
  }

  return response.json();
}

function getQuote(symbol) {
  return request({
    function: "GLOBAL_QUOTE",
    symbol,
  });
}

function getDailySeries(symbol) {
  return request({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
  });
}

module.exports = {
  getQuote,
  getDailySeries,
};
