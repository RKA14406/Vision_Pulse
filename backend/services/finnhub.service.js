const env = require("../config/env");

const BASE_URL = "https://finnhub.io/api/v1";

async function request(path, params = {}) {
  if (!env.finnhubApiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}${path}`);
  Object.entries({ ...params, token: env.finnhubApiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub request failed with ${response.status}`);
  }

  return response.json();
}

function getQuote(symbol) {
  return request("/quote", { symbol });
}

function getCompanyProfile(symbol) {
  return request("/stock/profile2", { symbol });
}

function getMarketNews(category = "general") {
  return request("/news", { category });
}

module.exports = {
  getQuote,
  getCompanyProfile,
  getMarketNews,
};
