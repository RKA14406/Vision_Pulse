import { API_KEYS } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";
import { getEvents } from "./dataStore.service.js";

const DEFAULT_NEWS_QUERY = '(gold OR silver OR bitcoin OR ethereum OR oil OR stocks OR "Federal Reserve" OR Fed OR FOMC OR CPI OR Trump OR tariff OR sanction OR speech OR remarks OR earnings OR Nvidia) AND market';

const SMALL_NEWS_FALLBACK = [
  {
    id: "seed_small_political_speech_watch",
    title: "Political speech watch: policy tone could move markets",
    description: "Leader speeches, campaign remarks, tariff comments, and foreign-policy statements can move USD, gold, oil, stocks, and crypto even when they are not formal calendar events.",
    source: { name: "VisionPulse seeded small-news watch" },
    publishedAt: new Date().toISOString(),
    url: null,
    category: "geopolitical",
    impactLevel: "low",
    importance: "low",
    impactReason: "Small headline risk can still trigger short-term chart movement.",
    assetHints: ["GOLD", "SPY", "QQQ", "BTC"],
    status: "watch",
    sourceMode: "seeded_small_news"
  },
  {
    id: "seed_fed_speaker_remarks_watch",
    title: "Fed speaker remarks watch",
    description: "Short comments about inflation, rates, jobs, or financial conditions can change bond yields and pressure gold, equities, and crypto intraday.",
    source: { name: "VisionPulse seeded small-news watch" },
    publishedAt: new Date().toISOString(),
    url: null,
    category: "central_bank",
    impactLevel: "medium",
    importance: "medium",
    impactReason: "Rate-expectation comments often affect gold, equities, and crypto.",
    assetHints: ["GOLD", "SILVER", "SPY", "QQQ", "BTC"],
    status: "watch",
    sourceMode: "seeded_small_news"
  },
  {
    id: "seed_oil_shipping_supply_watch",
    title: "Oil shipping and supply headline watch",
    description: "Shipping delays, sanctions comments, or inventory expectations can create oil moves and spill into inflation-sensitive assets.",
    source: { name: "VisionPulse seeded small-news watch" },
    publishedAt: new Date().toISOString(),
    url: null,
    category: "energy",
    impactLevel: "low",
    importance: "low",
    impactReason: "Energy headlines can affect oil first, then inflation expectations.",
    assetHints: ["OIL", "GOLD", "SPY"],
    status: "watch",
    sourceMode: "seeded_small_news"
  },
  {
    id: "seed_crypto_regulation_flow_watch",
    title: "Crypto regulation and ETF flow watch",
    description: "Minor regulatory comments, ETF flow articles, or exchange headlines can move BTC/ETH without appearing as a formal economic event.",
    source: { name: "VisionPulse seeded small-news watch" },
    publishedAt: new Date().toISOString(),
    url: null,
    category: "crypto",
    impactLevel: "low",
    importance: "low",
    impactReason: "Crypto reacts quickly to regulation, ETF demand, and liquidity headlines.",
    assetHints: ["BTC", "ETH"],
    status: "watch",
    sourceMode: "seeded_small_news"
  }
];

function daysFromNow(days, hour = 16, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildFutureSmallWatchEvents() {
  const templates = [
    {
      key: "fed_speaker_watch",
      days: [1, 4, 9, 15, 23],
      hour: 17,
      title: "Fed speaker / rate remarks watch",
      description: "Scheduled watch for central-bank remarks that may affect yields, USD, gold, equities, and crypto even when no formal rate decision is due.",
      category: "central_bank",
      impactLevel: "medium",
      importance: "medium",
      assetHints: ["GOLD", "SILVER", "SPY", "QQQ", "BTC"],
      impactReason: "Central-bank comments can move charts by changing rate-cut or inflation expectations."
    },
    {
      key: "political_trade_speech_watch",
      days: [2, 8, 14, 21, 29],
      hour: 20,
      title: "Political speech / tariff headline watch",
      description: "Watch for political speeches, tariff comments, sanctions language, or campaign-policy remarks that can move risk assets, USD, gold, and oil.",
      category: "geopolitical",
      impactLevel: "low",
      importance: "low",
      assetHints: ["GOLD", "OIL", "SPY", "QQQ", "BTC"],
      impactReason: "Small political headlines can still create short-term chart movement."
    },
    {
      key: "oil_inventory_shipping_watch",
      days: [3, 10, 17, 24],
      hour: 18,
      title: "Oil inventory / shipping risk watch",
      description: "Watch for oil inventory expectations, OPEC comments, shipping disruptions, or sanction headlines that can move crude and inflation-sensitive assets.",
      category: "energy",
      impactLevel: "medium",
      importance: "medium",
      assetHints: ["OIL", "GOLD", "SPY"],
      impactReason: "Energy headlines can affect oil first and then inflation expectations."
    },
    {
      key: "crypto_etf_regulation_watch",
      days: [5, 12, 19, 26],
      hour: 19,
      title: "Crypto ETF / regulation flow watch",
      description: "Watch for ETF flow stories, exchange headlines, SEC comments, or institutional crypto demand updates that may affect BTC and ETH.",
      category: "crypto",
      impactLevel: "low",
      importance: "low",
      assetHints: ["BTC", "ETH"],
      impactReason: "Crypto often reacts quickly to regulation, ETF flow, and liquidity headlines."
    },
    {
      key: "mega_cap_ai_earnings_watch",
      days: [6, 13, 20, 27],
      hour: 16,
      title: "Mega-cap AI / earnings guidance watch",
      description: "Watch for AI chip demand, guidance, analyst revisions, and mega-cap tech headlines that may affect Nvidia, Nasdaq, and broad risk appetite.",
      category: "earnings",
      impactLevel: "low",
      importance: "low",
      assetHints: ["NVDA", "QQQ", "SPY"],
      impactReason: "Tech leadership headlines can move Nasdaq and AI-linked stocks."
    }
  ];

  return templates.flatMap((template) => template.days.map((day, index) => ({
    id: `future_${template.key}_${day}`,
    title: `${template.title} #${index + 1}`,
    description: template.description,
    source: { name: "VisionPulse next-30-day small-news watch" },
    publishedAt: daysFromNow(day, template.hour),
    eventTime: daysFromNow(day, template.hour),
    url: null,
    category: template.category,
    impactLevel: template.impactLevel,
    importance: template.importance,
    impactReason: template.impactReason,
    assetHints: template.assetHints,
    status: "upcoming",
    sourceMode: "seeded_future_small_watch",
    isCalendarEvent: false,
    isLiveNews: false,
    isUpcoming: true,
    isPast: false
  })));
}

function hashText(value = "") {
  return String(value)
    .split("")
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function cleanId(value = "news") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "news";
}

function inferAssetHints(text = "") {
  const clean = text.toLowerCase();
  const hints = [];

  if (/gold|xau|bullion|precious metal/.test(clean)) hints.push("GOLD");
  if (/silver|xag/.test(clean)) hints.push("SILVER");
  if (/bitcoin|btc/.test(clean)) hints.push("BTC");
  if (/ethereum|ether|eth/.test(clean)) hints.push("ETH");
  if (/oil|crude|opec|eia|energy|brent|wti/.test(clean)) hints.push("OIL");
  if (/s&p|spy|stock|stocks|equities|wall street|market rally|market selloff/.test(clean)) hints.push("SPY");
  if (/nasdaq|qqq|tech|technology/.test(clean)) hints.push("QQQ");
  if (/nvidia|nvda|ai chips|semiconductor/.test(clean)) hints.push("NVDA");

  if (/fed|fomc|rate|rates|inflation|cpi|powell|yellen|tariff|trump|sanction|war/.test(clean)) {
    hints.push("GOLD", "SPY", "QQQ", "BTC");
  }

  return [...new Set(hints)].slice(0, 6);
}

function inferImpact(article = {}) {
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();

  if (/fomc|fed decision|interest rate decision|cpi|inflation report|jobs report|nonfarm|opec|eia inventory|sec approval|etf approval|earnings|guidance|war|attack|sanction|tariff/.test(text)) {
    return {
      impactLevel: "high",
      importance: "high",
      impactReason: "Contains a high-sensitivity macro, policy, energy, crypto, geopolitical, or earnings catalyst."
    };
  }

  if (/fed|powell|yellen|rate|inflation|tariff|sanction|war|attack|opec|inventory|sec|etf|earnings|guidance|speech|remarks|says|comment|talk|interview|meeting|vote|poll|election|trump/.test(text)) {
    return {
      impactLevel: "medium",
      importance: "medium",
      impactReason: "Contains a policy, speech, macro, energy, crypto, corporate, or political keyword that can move charts."
    };
  }

  return {
    impactLevel: "low",
    importance: "low",
    impactReason: "Small market headline monitored for possible short-term chart impact."
  };
}

function articleTime(article = {}) {
  return article.eventTime || article.publishedAt || new Date().toISOString();
}

function isWithinWindow(value, pastDays = 30, futureDays = 30) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const now = Date.now();
  const min = now - pastDays * 24 * 60 * 60 * 1000;
  const max = now + futureDays * 24 * 60 * 60 * 1000;
  return date.getTime() >= min && date.getTime() <= max;
}

function normalizeCalendarEvent(event) {
  const time = event.eventTime || new Date().toISOString();
  const isFuture = new Date(time).getTime() > Date.now();
  return {
    id: `calendar_${event.id}`,
    eventId: event.id,
    title: event.title,
    description: event.description,
    source: { name: event.source || "Seeded event calendar" },
    publishedAt: time,
    eventTime: time,
    url: null,
    category: event.category || "calendar",
    impactLevel: event.importance || "medium",
    importance: event.importance || "medium",
    impactReason: isFuture
      ? "Upcoming scheduled event in the next 30-day market calendar."
      : "Past scheduled event available for review and chart context.",
    assetHints: event.affectedAssets || [],
    status: isFuture ? "upcoming" : "past",
    sourceMode: "seeded_event_calendar",
    isCalendarEvent: true,
    isUpcoming: isFuture,
    isPast: !isFuture
  };
}

async function calendarNewsWindow(pageSize = 30, pastDays = 30, futureDays = 30) {
  const events = await getEvents();
  return events
    .map(normalizeCalendarEvent)
    .filter((item) => isWithinWindow(item.eventTime || item.publishedAt, pastDays, futureDays))
    .sort((a, b) => new Date(a.eventTime || a.publishedAt) - new Date(b.eventTime || b.publishedAt))
    .slice(0, pageSize);
}

async function seededNewsFallback(query, pageSize, source, message, error = null) {
  const calendar = await calendarNewsWindow(pageSize, 30, 30);
  const futureWatch = buildFutureSmallWatchEvents();
  const merged = [...calendar, ...futureWatch, ...SMALL_NEWS_FALLBACK]
    .sort((a, b) => {
      const aFuture = new Date(articleTime(a)).getTime() > Date.now();
      const bFuture = new Date(articleTime(b)).getTime() > Date.now();
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return new Date(articleTime(a)) - new Date(articleTime(b));
    })
    .slice(0, pageSize);

  return {
    source,
    query,
    articles: merged,
    message,
    error,
    windowDays: 30,
    includesCalendar: true
  };
}

function normalizeLiveArticle(article = {}) {
  const impact = inferImpact(article);
  const text = `${article.title || ""} ${article.description || ""}`;
  const assetHints = inferAssetHints(text);
  const publishedAt = article.publishedAt || new Date().toISOString();
  const idSource = article.url || `${article.title || "news"}_${publishedAt}`;

  return {
    id: `live_${cleanId(article.title || "news")}_${Math.abs(hashText(idSource))}`,
    title: article.title || "Untitled market headline",
    description: article.description || impact.impactReason,
    source: article.source || { name: "NewsAPI" },
    publishedAt,
    eventTime: publishedAt,
    url: article.url || null,
    category: "live_news",
    ...impact,
    assetHints,
    status: "published",
    sourceMode: "newsapi",
    isLiveNews: true,
    isPast: new Date(publishedAt).getTime() <= Date.now(),
    isUpcoming: false
  };
}

function dedupeArticles(items = []) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = `${String(item.title || "").toLowerCase()}|${String(item.source?.name || item.source || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export async function getMarketNews(query = "", pageSize = 30) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 45, 1), 60);
  const broadQuery = String(query || "").trim() || DEFAULT_NEWS_QUERY;
  const calendar = await calendarNewsWindow(safePageSize, 30, 30);
  const futureWatch = buildFutureSmallWatchEvents();

  if (!API_KEYS.NEWS) {
    return seededNewsFallback(
      broadQuery,
      safePageSize,
      "mock_from_seeded_events",
      "NEWS_API_KEY missing. Returned next-30-day calendar items plus future small-watch and seeded small-news headlines."
    );
  }

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", broadQuery);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("from", from);
  url.searchParams.set("pageSize", String(Math.min(safePageSize, 30)));
  url.searchParams.set("apiKey", API_KEYS.NEWS);

  const result = await safeFetchJson(url.toString(), { timeoutMs: 10000 });
  if (!result.ok || !Array.isArray(result.data?.articles)) {
    return seededNewsFallback(
      broadQuery,
      safePageSize,
      "mock_after_newsapi_failure",
      "NewsAPI did not return usable articles. Returned next-30-day calendar items plus future small-watch and seeded small-news headlines.",
      result.error
    );
  }

  const liveArticles = result.data.articles.map(normalizeLiveArticle);
  const merged = dedupeArticles([...calendar, ...futureWatch, ...liveArticles, ...SMALL_NEWS_FALLBACK])
    .sort((a, b) => {
      const aFuture = new Date(articleTime(a)).getTime() > Date.now();
      const bFuture = new Date(articleTime(b)).getTime() > Date.now();
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return new Date(articleTime(b)) - new Date(articleTime(a));
    })
    .slice(0, safePageSize);

  return {
    source: "newsapi_plus_calendar",
    query: broadQuery,
    articles: merged,
    windowDays: 30,
    includesCalendar: true,
    message: "Combined next-30-day scheduled events, future small-watch items, and live/small NewsAPI headlines."
  };
}
