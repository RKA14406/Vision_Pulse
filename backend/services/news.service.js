import { API_KEYS } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";
import { getEvents } from "./dataStore.service.js";

export async function getMarketNews(query = "financial markets", pageSize = 6) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 6, 1), 20);

  if (!API_KEYS.NEWS) {
    const events = await getEvents();
    return {
      source: "mock_from_seeded_events",
      query,
      articles: events.slice(0, safePageSize).map((event) => ({
        title: event.title,
        description: event.description,
        source: { name: event.source },
        publishedAt: event.eventTime,
        url: null,
        category: event.category,
        importance: event.importance
      })),
      message: "NEWS_API_KEY missing. Returned seeded event headlines."
    };
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(safePageSize));
  url.searchParams.set("apiKey", API_KEYS.NEWS);

  const result = await safeFetchJson(url.toString());
  if (!result.ok || !Array.isArray(result.data?.articles)) {
    const fallback = await getMarketNews(query, safePageSize);
    fallback.source = "mock_after_newsapi_failure";
    fallback.error = result.error;
    return fallback;
  }

  return {
    source: "newsapi",
    query,
    articles: result.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      source: article.source,
      publishedAt: article.publishedAt,
      url: article.url
    }))
  };
}
