const API_BASE = "/api";

const state = {
  assets: [],
  events: [],
  predictions: [],
  selectedPrediction: null,
  reviews: [],
  news: [],
  apiStatus: [],
  selectedChartSymbol: null
};

const els = {
  backendStatus: document.querySelector("#backendStatus"),
  apiStatusGrid: document.querySelector("#apiStatusGrid"),
  refreshApiStatusBtn: document.querySelector("#refreshApiStatusBtn"),
  newsGrid: document.querySelector("#newsGrid"),
  feedSummary: document.querySelector("#feedSummary"),
  feedTypeFilter: document.querySelector("#feedTypeFilter"),
  newsQueryInput: document.querySelector("#newsQueryInput"),
  refreshNewsBtn: document.querySelector("#refreshNewsBtn"),
  assetsGrid: document.querySelector("#assetsGrid"),
  eventsGrid: document.querySelector("#eventsGrid"),
  predictionsGrid: document.querySelector("#predictionsGrid"),
  reviewsGrid: document.querySelector("#reviewsGrid"),
  assetCount: document.querySelector("#assetCount"),
  eventCount: document.querySelector("#eventCount"),
  reviewAvg: document.querySelector("#reviewAvg"),
  assetFilter: document.querySelector("#assetFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  eventSelect: document.querySelector("#eventSelect"),
  assetSelect: document.querySelector("#assetSelect"),
  chartAssetSelect: document.querySelector("#chartAssetSelect"),
  refreshChartBtn: document.querySelector("#refreshChartBtn"),
  chartAssetCanvas: document.querySelector("#assetChartCanvas"),
  chartAssetTitle: document.querySelector("#chartAssetTitle"),
  chartAssetSubtitle: document.querySelector("#chartAssetSubtitle"),
  chartPrice: document.querySelector("#chartPrice"),
  chartChange: document.querySelector("#chartChange"),
  chartSource: document.querySelector("#chartSource"),
  chartLastUpdated: document.querySelector("#chartLastUpdated"),
  chartMode: document.querySelector("#chartMode"),
  chartEventsList: document.querySelector("#chartEventsList"),
  testConsole: document.querySelector("#testConsole"),
  reloadDashboardBtn: document.querySelector("#reloadDashboardBtn"),
  runTestsBtn: document.querySelector("#runTestsBtn"),
  refreshPricesBtn: document.querySelector("#refreshPricesBtn"),
  generatePredictionBtn: document.querySelector("#generatePredictionBtn")
};

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `GET ${path} failed`);
  }
  return data;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `POST ${path} failed`);
  }
  return data;
}

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: Number(value) > 100 ? 2 : 4
  });
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function compact(value, maxLength = 120) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "--";
  return text.length > maxLength ? text.slice(0, Math.max(0, maxLength - 1)).trim() + "…" : text;
}

function formatTime(value) {
  if (!value) return "Seeded local data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Seeded local data";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function providerLabel(source) {
  const clean = String(source || "mock").toLowerCase();
  if (clean === "mock" || clean === "seeded" || clean.includes("mock_from")) return "Mock fallback";
  if (clean.includes("mock_after")) return "Fallback active";
  if (clean.includes("fallback") || clean.includes("rule")) return "Rule fallback";
  if (clean.includes("gemini")) return "Gemini + Rules";
  if (clean.includes("alpha")) return "Live API";
  if (clean.includes("finnhub")) return "Live API";
  if (clean.includes("newsapi")) return "Live API";
  if (clean.includes("fred")) return "Live API";
  if (clean.includes("eia")) return "Live API";
  if (clean.includes("stooq")) return "Live backup";
  if (clean.includes("metal_spot_demo_backup")) return "Spot backup";
  return "Live/API";
}

function providerDetail(source, providerSymbol) {
  const clean = String(source || "mock").toLowerCase();
  if (clean === "mock" || clean === "seeded" || clean.includes("mock_from")) return "Seeded mock data";
  if (clean.includes("mock_after")) return "Provider failed; fallback data active";
  if (clean.includes("fallback")) return "Rule engine backup";
  if (clean.includes("stooq")) return `Provider: no-key XAU/XAG USD backup${providerSymbol ? ` • ${providerSymbol}` : ""}`;
  if (clean.includes("metal_spot_demo_backup")) return `Provider: transparent demo spot backup${providerSymbol ? ` • ${providerSymbol}` : ""}`;
  const provider = clean.replaceAll("_", " ");
  return `Provider: ${provider}${providerSymbol ? ` • ${providerSymbol}` : ""}`;
}

function userFacingPredictionSource(source) {
  const clean = String(source || "seeded").toLowerCase();
  if (clean.includes("gemini")) return "Gemini + rules";
  if (clean.includes("fallback") || clean.includes("mock") || clean.includes("rule")) return "Rule engine";
  return "Seeded example";
}

function makeSparkline(points = []) {
  if (!points.length) return "";
  const width = 280;
  const height = 46;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / Math.max(points.length - 1, 1);
  const path = points.map((point, index) => {
    const x = index * step;
    const y = height - ((point - min) / range) * (height - 6) - 3;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${path}" fill="none" stroke="currentColor" stroke-width="3" opacity="0.95"></path>
    </svg>
  `;
}

function statusClass(status) {
  const clean = String(status || "fallback").toLowerCase();
  if (clean === "live" || clean === "configured") return "live";
  if (clean === "failed") return "bad";
  return "mock";
}

function renderApiStatus(data = {}) {
  const providers = Array.isArray(data.providers) ? data.providers : [];
  state.apiStatus = providers;

  if (!providers.length) {
    els.apiStatusGrid.innerHTML = `
      <article class="card api-status-card">
        <span class="badge mock">Waiting</span>
        <h3>API status unavailable</h3>
        <p>Backend status endpoint has not returned provider details yet.</p>
      </article>
    `;
    return;
  }

  els.apiStatusGrid.innerHTML = providers.map((provider) => {
    const klass = statusClass(provider.status);
    return `
      <article class="card api-status-card">
        <div class="api-status-top">
          <span class="api-dot ${klass}"></span>
          <span class="badge ${klass}">${escapeHtml(provider.label || provider.status)}</span>
        </div>
        <h3>${escapeHtml(provider.name)}</h3>
        <p>${escapeHtml(provider.mode || "Provider mode")}</p>
        <div class="api-detail">${escapeHtml(provider.detail || "No detail available.")}</div>
        <div class="quote-footnote">
          <span>${provider.configured ? "Key configured" : "Key missing"}</span>
          <span>${escapeHtml(provider.source ? providerLabel(provider.source) : "Status check")}</span>
        </div>
      </article>
    `;
  }).join("");
}

async function loadApiStatus(probe = false) {
  if (probe) els.refreshApiStatusBtn.textContent = "Checking...";
  try {
    const result = await apiGet(`/ai/status${probe ? "?probe=true" : ""}`);
    renderApiStatus(result.data);
    if (probe) {
      const summary = result.data.summary || {};
      els.testConsole.textContent = `API status probe completed: ${summary.live || 0} live, ${summary.fallback || 0} fallback, ${summary.failed || 0} failed.\n\n${JSON.stringify(result.data.providers, null, 2)}`;
    }
  } catch (error) {
    els.apiStatusGrid.innerHTML = `
      <article class="card api-status-card">
        <span class="badge bad">Failed</span>
        <h3>API status failed</h3>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  } finally {
    if (probe) els.refreshApiStatusBtn.textContent = "Refresh API Status";
  }
}


function hashText(value = "") {
  return Math.abs(String(value).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0));
}

function cleanId(value = "news") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70) || "news";
}

function sourceName(source) {
  if (!source) return "Market source";
  if (typeof source === "string") return source;
  return source.name || "Market source";
}

function defaultNewsQuery() {
  return '(gold OR silver OR bitcoin OR ethereum OR oil OR stocks OR "Federal Reserve" OR Fed OR FOMC OR CPI OR Trump OR tariff OR sanction OR speech OR remarks OR earnings OR Nvidia) AND market';
}

function articleDateValue(article = {}) {
  const value = article.eventTime || article.publishedAt || article.date;
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function articleStatusLabel(article = {}) {
  if (article.isUpcoming || article.status === "upcoming") return "Upcoming";
  if (article.isCalendarEvent) return "Calendar";
  if (article.isLiveNews) return "Live news";
  if (article.sourceMode?.includes("seeded")) return "Seeded watch";
  return "News";
}

function assetHintsForArticle(article = {}) {
  const hints = Array.isArray(article.assetHints) ? article.assetHints : [];
  const affected = Array.isArray(article.affectedAssets) ? article.affectedAssets : [];
  return [...new Set([...hints, ...affected].map((item) => String(item).toUpperCase()).filter(Boolean))];
}

function newsToPredictionEvent(article = {}) {
  const rawId = article.eventId || article.id || `news_${cleanId(article.title)}_${hashText(article.title || article.url || Date.now())}`;
  const isCalendar = Boolean(article.isCalendarEvent) || String(article.sourceMode || "").includes("calendar");
  const cleanCalendarId = String(rawId).startsWith("calendar_") ? String(rawId).replace("calendar_", "") : String(rawId);
  const assetHints = assetHintsForArticle(article);

  return {
    id: isCalendar ? cleanCalendarId : rawId,
    optionId: isCalendar ? cleanCalendarId : `news_${rawId}`,
    title: article.title || "Selected market news",
    description: article.description || article.impactReason || "Live/small market news selected from the Market Intelligence Feed section.",
    category: article.category || "live_news",
    eventTime: article.eventTime || article.publishedAt || new Date().toISOString(),
    publishedAt: article.publishedAt || article.eventTime || new Date().toISOString(),
    importance: article.importance || article.impactLevel || "medium",
    status: article.status || (articleDateValue(article).getTime() > Date.now() ? "upcoming" : "published"),
    region: article.region || "global",
    source: sourceName(article.source),
    sourceMode: article.sourceMode || "market_intelligence_feed",
    affectedAssets: assetHints,
    assetHints,
    url: article.url || null,
    isVirtualNews: !isCalendar,
    isCalendarEvent: isCalendar
  };
}

function allPredictionEvents() {
  const calendarEvents = state.events.map((event) => ({
    ...event,
    optionId: event.id,
    isVirtualNews: false,
    isCalendarEvent: true
  }));

  const newsEvents = state.news
    .map(newsToPredictionEvent)
    .filter((event) => event.title && event.optionId)
    .filter((event) => !calendarEvents.some((calendarEvent) => calendarEvent.id === event.id));

  return [...calendarEvents, ...newsEvents];
}

function getSelectableEvent(optionId) {
  return allPredictionEvents().find((event) => event.optionId === optionId || event.id === optionId) || null;
}

function newsImpactClass(level) {
  const clean = String(level || "low").toLowerCase();
  if (clean.includes("critical") || clean.includes("high") || clean.includes("major")) return "high";
  if (clean.includes("medium") || clean.includes("watch")) return "medium";
  return "low";
}

function normalizeCalendarEventForFeed(event = {}) {
  const time = event.eventTime || new Date().toISOString();
  const isFuture = new Date(time).getTime() > Date.now();
  return {
    id: `calendar_${event.id}`,
    eventId: event.id,
    title: event.title || "Scheduled market event",
    description: event.description || "Scheduled event from the smart market calendar.",
    source: { name: event.source || "Smart Event Calendar" },
    publishedAt: time,
    eventTime: time,
    url: null,
    category: event.category || "calendar",
    impactLevel: event.importance || "medium",
    importance: event.importance || "medium",
    impactReason: isFuture ? "Upcoming scheduled event in the next 30-day market calendar." : "Past scheduled event used for chart/review context.",
    assetHints: event.affectedAssets || [],
    status: isFuture ? "upcoming" : "past",
    sourceMode: "smart_event_calendar",
    isCalendarEvent: true,
    isUpcoming: isFuture,
    isPast: !isFuture
  };
}

function combinedFeedArticles() {
  const byKey = new Map();
  const push = (article) => {
    const key = String(article.eventId || article.id || `${article.title}_${article.eventTime || article.publishedAt}`).toLowerCase();
    if (!key || byKey.has(key)) return;
    byKey.set(key, article);
  };

  state.news.forEach(push);
  state.events.map(normalizeCalendarEventForFeed).forEach(push);

  return [...byKey.values()].sort((a, b) => {
    const aFuture = articleDateValue(a).getTime() > Date.now() || a.isUpcoming;
    const bFuture = articleDateValue(b).getTime() > Date.now() || b.isUpcoming;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return articleDateValue(a) - articleDateValue(b);
  });
}

function feedArticleMatchesFilters(article = {}) {
  const selectedAsset = els.assetFilter?.value || "all";
  const selectedCategory = els.categoryFilter?.value || "all";
  const selectedType = els.feedTypeFilter?.value || "all";
  const assets = assetHintsForArticle(article);
  const category = String(article.category || "").toLowerCase();
  const isFuture = articleDateValue(article).getTime() > Date.now() || article.isUpcoming || article.status === "upcoming";
  const isCalendar = Boolean(article.isCalendarEvent) || String(article.sourceMode || "").includes("calendar");
  const isSmall = String(article.sourceMode || "").includes("small") || String(article.impactLevel || article.importance || "").toLowerCase() === "low";
  const isImportant = isImportantMarketItem(article);

  const assetMatch = selectedAsset === "all" || assets.includes(selectedAsset);
  const categoryMatch = selectedCategory === "all" || category === selectedCategory;

  let typeMatch = true;
  if (selectedType === "future") typeMatch = Boolean(isFuture);
  if (selectedType === "past") typeMatch = !isFuture;
  if (selectedType === "calendar") typeMatch = isCalendar;
  if (selectedType === "news") typeMatch = !isCalendar;
  if (selectedType === "small") typeMatch = isSmall;
  if (selectedType === "important") typeMatch = isImportant;

  return assetMatch && categoryMatch && typeMatch;
}

function renderMarketFeed() {
  if (!els.newsGrid) return;

  const all = combinedFeedArticles();
  const filtered = all.filter(feedArticleMatchesFilters);
  const futureCount = all.filter((article) => articleDateValue(article).getTime() > Date.now() || article.isUpcoming).length;
  const calendarCount = all.filter((article) => article.isCalendarEvent || String(article.sourceMode || "").includes("calendar")).length;
  const smallCount = all.filter((article) => String(article.sourceMode || "").includes("small") || String(article.impactLevel || article.importance || "").toLowerCase() === "low").length;

  if (els.feedSummary) {
    els.feedSummary.textContent = `Showing ${filtered.length} / ${all.length} items • ${futureCount} future • ${calendarCount} calendar • ${smallCount} small-watch`;
  }

  if (!filtered.length) {
    els.newsGrid.innerHTML = `
      <article class="card news-card">
        <span class="badge mock">No matching items</span>
        <h3>No market intelligence items matched your filters</h3>
        <p>Try All Feed, All Assets, or press Refresh Feed to reload next-month events and live/small news.</p>
      </article>
    `;
    return;
  }

  els.newsGrid.innerHTML = filtered.map((article) => {
    const level = article.impactLevel || article.importance || "low";
    const klass = newsImpactClass(level);
    const dateText = formatTime(article.eventTime || article.publishedAt);
    const assets = assetHintsForArticle(article);
    const optionEvent = newsToPredictionEvent(article);
    const status = articleStatusLabel(article);
    const isFuture = articleDateValue(article).getTime() > Date.now() || article.isUpcoming || article.status === "upcoming";
    const isCalendar = Boolean(article.isCalendarEvent) || String(article.sourceMode || "").includes("calendar");
    const typeLabel = isCalendar ? "Calendar" : String(article.sourceMode || "").includes("small") ? "Small watch" : "Live news";

    return `
      <article class="card news-card ${isFuture ? "future-news" : "past-news"}" data-news-option-id="${escapeHtml(optionEvent.optionId)}" data-news-first-asset="${escapeHtml(assets[0] || "")}">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(compact(article.title, 92))}</h3>
            <p>${escapeHtml(typeLabel)} • ${escapeHtml(sourceName(article.source))} • ${escapeHtml(dateText)}</p>
          </div>
          <span class="badge ${klass === "high" ? "high" : klass === "medium" ? "mock" : ""}">${escapeHtml(status)} • ${escapeHtml(level)}</span>
        </div>
        <p>${escapeHtml(compact(article.description || article.impactReason || "Headline monitored for possible chart impact.", 155))}</p>
        <div class="meta-list">
          <span>${escapeHtml(typeLabel)}</span>
          <span>${escapeHtml(article.category || "market_news")}</span>
          ${assets.slice(0, 5).map((asset) => `<span>${escapeHtml(asset)}</span>`).join("")}
        </div>
        <div class="news-actions">
          <button class="small-btn use-news-btn" type="button" data-news-option-id="${escapeHtml(optionEvent.optionId)}" data-news-first-asset="${escapeHtml(assets[0] || "")}">Use in Prediction</button>
          <button class="small-btn secondary show-news-chart-btn" type="button" data-news-first-asset="${escapeHtml(assets[0] || "")}">Show on Chart</button>
        </div>
      </article>
    `;
  }).join("");

  els.newsGrid.querySelectorAll(".use-news-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const optionId = button.dataset.newsOptionId;
      const firstAsset = button.dataset.newsFirstAsset;
      if (optionId) els.eventSelect.value = optionId;
      if (firstAsset && state.assets.some((asset) => asset.symbol === firstAsset)) {
        els.assetSelect.value = firstAsset;
        state.selectedChartSymbol = firstAsset;
        els.chartAssetSelect.value = firstAsset;
      }
      clearSelectedPrediction();
      renderChart();
      document.querySelector(".generator-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  els.newsGrid.querySelectorAll(".show-news-chart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const firstAsset = button.dataset.newsFirstAsset;
      if (firstAsset) selectChartAsset(firstAsset);
    });
  });
}
function renderNews(data = {}) {
  const articles = Array.isArray(data.articles) ? data.articles : [];
  state.news = articles;

  renderFilters();
  renderMarketFeed();
  renderChart();
  renderReviews();
}


async function loadNews() {
  if (!els.newsGrid) return;
  const query = els.newsQueryInput?.value?.trim() || defaultNewsQuery();
  if (els.refreshNewsBtn) els.refreshNewsBtn.textContent = "Loading...";

  try {
    const result = await apiGet(`/news?query=${encodeURIComponent(query)}&pageSize=45`);
    renderNews(result.data);
    els.testConsole.textContent = `Market Intelligence Feed updated: ${result.data.articles?.length || 0} items loaded. Includes next-month scheduled events plus live/small daily headlines when available.`;
  } catch (error) {
    els.newsGrid.innerHTML = `
      <article class="card news-card">
        <span class="badge bad">Failed</span>
        <h3>News load failed</h3>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  } finally {
    if (els.refreshNewsBtn) els.refreshNewsBtn.textContent = "Refresh Feed";
  }
}

function renderAssets() {
  els.assetsGrid.innerHTML = state.assets.map((asset) => {
    const live = asset.liveQuote || {};
    const hasLivePrice = live.price !== null && live.price !== undefined;
    const price = hasLivePrice ? live.price : asset.mockPrice;
    const change = hasLivePrice ? live.changePct : asset.mockChangePct;
    const upDown = Number(change) >= 0 ? "up" : "down";
    const source = live.source || "mock";
    const isLive = hasLivePrice && !["mock", "seeded"].includes(String(source).toLowerCase()) && !String(source).includes("mock_after") && !String(source).includes("metal_spot_demo_backup");
    const lastUpdated = live.timestamp ? `Last updated: ${formatTime(live.timestamp)}` : "Last updated: local mock";

    return `
      <article class="card asset-card" data-symbol="${escapeHtml(asset.symbol)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(asset.name)} chart">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(asset.name)}</h3>
            <p>${escapeHtml(asset.displaySymbol)} • ${escapeHtml(asset.category)}</p>
          </div>
          <span class="badge ${isLive ? "live" : "mock"}">${providerLabel(source)}</span>
        </div>
        <div class="price">${money(price)}</div>
        <div class="change ${upDown}">${pct(change)}</div>
        ${makeSparkline(live.sparkline || asset.sparkline)}
        <div class="quote-footnote">
          <span>${escapeHtml(providerDetail(source, live.providerSymbol))}</span>
          <span>${escapeHtml(lastUpdated)}</span>
        </div>
        <div class="meta-list">
          ${(asset.sensitivity || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("");

  els.assetsGrid.querySelectorAll(".asset-card").forEach((card) => {
    const symbol = card.dataset.symbol;
    card.addEventListener("click", () => selectChartAsset(symbol));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectChartAsset(symbol);
      }
    });
  });

  els.assetCount.textContent = state.assets.length;
}

function renderFilters() {
  const previousEvent = els.eventSelect.value;
  const previousAsset = els.assetSelect.value;
  const previousFeedAsset = els.assetFilter?.value || "all";
  const previousCategory = els.categoryFilter?.value || "all";
  const previousFeedType = els.feedTypeFilter?.value || "all";

  els.assetFilter.innerHTML = `<option value="all">All assets</option>` + state.assets
    .map((asset) => `<option value="${escapeHtml(asset.symbol)}">${escapeHtml(asset.name)}</option>`)
    .join("");

  if (previousFeedAsset && [...els.assetFilter.options].some((option) => option.value === previousFeedAsset)) {
    els.assetFilter.value = previousFeedAsset;
  }
  if (previousCategory && [...els.categoryFilter.options].some((option) => option.value === previousCategory)) {
    els.categoryFilter.value = previousCategory;
  }
  if (previousFeedType && els.feedTypeFilter && [...els.feedTypeFilter.options].some((option) => option.value === previousFeedType)) {
    els.feedTypeFilter.value = previousFeedType;
  }

  els.assetSelect.innerHTML = state.assets
    .map((asset) => `<option value="${escapeHtml(asset.symbol)}">${escapeHtml(asset.name)} (${escapeHtml(asset.symbol)})</option>`)
    .join("");

  els.chartAssetSelect.innerHTML = state.assets
    .map((asset) => `<option value="${escapeHtml(asset.symbol)}">${escapeHtml(asset.name)} (${escapeHtml(asset.displaySymbol || asset.symbol)})</option>`)
    .join("");

  const selectableEvents = allPredictionEvents();
  const calendarOptions = selectableEvents
    .filter((event) => !event.isVirtualNews)
    .map((event) => `<option value="${escapeHtml(event.optionId || event.id)}">Calendar: ${escapeHtml(event.title)}</option>`)
    .join("");

  const newsOptions = selectableEvents
    .filter((event) => event.isVirtualNews)
    .slice(0, 30)
    .map((event) => `<option value="${escapeHtml(event.optionId || event.id)}">News: ${escapeHtml(compact(event.title, 80))}</option>`)
    .join("");

  els.eventSelect.innerHTML = `
    <optgroup label="Scheduled Events">
      ${calendarOptions || `<option disabled>No calendar events loaded</option>`}
    </optgroup>
    <optgroup label="Live + Small News">
      ${newsOptions || `<option disabled>Refresh Feed to load live headlines</option>`}
    </optgroup>
  `;

  if (previousEvent && [...els.eventSelect.options].some((option) => option.value === previousEvent)) {
    els.eventSelect.value = previousEvent;
  }

  if (previousAsset && state.assets.some((asset) => asset.symbol === previousAsset)) {
    els.assetSelect.value = previousAsset;
  }

  if (!state.selectedChartSymbol && state.assets[0]) {
    state.selectedChartSymbol = state.assets[0].symbol;
  }

  if (state.selectedChartSymbol) {
    els.chartAssetSelect.value = state.selectedChartSymbol;
  }
}

function renderEvents() {
  if (els.eventCount) els.eventCount.textContent = state.events.length;
  renderMarketFeed();
}


function chartPointsForAsset(asset) {
  const live = asset.liveQuote || {};
  const rawPoints = Array.isArray(live.sparkline) && live.sparkline.length
    ? live.sparkline
    : Array.isArray(asset.sparkline)
      ? asset.sparkline
      : [];

  const points = rawPoints
    .map((point) => Number(point))
    .filter((point) => Number.isFinite(point));

  if (Number.isFinite(Number(live.price)) && points.length) {
    const latest = Number(live.price);
    const last = points[points.length - 1];
    const ratio = last ? Math.abs((latest - last) / last) : 0;

    // Overlay live price only when it is in the same rough scale as the seeded chart.
    // This prevents a bad provider response from crushing the demo chart visually.
    if (ratio < 0.35) {
      points[points.length - 1] = latest;
    }
  }

  return points;
}

function isImportantMarketItem(item = {}) {
  const level = String(item.importance || item.impactLevel || "low").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();

  return (
    level.includes("critical") ||
    level.includes("high") ||
    level.includes("medium") ||
    /macro|central_bank|energy|crypto|earnings|geopolitical/.test(category) ||
    /fed|fomc|cpi|inflation|rate|opec|eia|war|sanction|tariff|etf|earnings|trump|speech|remarks/.test(text)
  );
}

function markerTime(item = {}) {
  return articleDateValue(item);
}

function chartMarkersForAsset(symbol) {
  const now = Date.now();
  const calendarMarkers = state.events
    .filter((event) => Array.isArray(event.affectedAssets) && event.affectedAssets.includes(symbol))
    .map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      importance: event.importance,
      impactLevel: event.importance,
      eventTime: event.eventTime,
      source: event.source || "Calendar",
      sourceType: "calendar",
      isFuture: new Date(event.eventTime).getTime() > now
    }));

  const newsMarkers = state.news
    .filter((article) => assetHintsForArticle(article).includes(symbol))
    .filter(isImportantMarketItem)
    .map((article) => ({
      id: article.id,
      title: article.title,
      category: article.category || "news",
      importance: article.importance || article.impactLevel || "medium",
      impactLevel: article.impactLevel || article.importance || "medium",
      eventTime: article.eventTime || article.publishedAt,
      source: sourceName(article.source),
      sourceType: article.isCalendarEvent ? "calendar" : "news",
      isFuture: markerTime(article).getTime() > now
    }));

  const byKey = new Map();
  [...calendarMarkers, ...newsMarkers]
    .filter(isImportantMarketItem)
    .forEach((marker) => {
      const key = `${marker.title}_${marker.eventTime}`.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, marker);
    });

  const all = [...byKey.values()].sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
  const past = all.filter((item) => new Date(item.eventTime).getTime() <= now).slice(-4);
  const future = all.filter((item) => new Date(item.eventTime).getTime() > now).slice(0, 4);
  return [...past, ...future];
}

function selectedAssetEvents(symbol) {
  return chartMarkersForAsset(symbol);
}

function drawAssetChart(asset) {
  const canvas = els.chartAssetCanvas;
  const ctx = canvas.getContext("2d");
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(640, rect.width || 800);
  const height = 320;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = "100%";
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const points = chartPointsForAsset(asset);
  const padding = { top: 26, right: 52, bottom: 42, left: 58 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.fillStyle = "rgba(255,255,255,0.025)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(238,246,255,0.62)";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  if (points.length < 2) {
    ctx.fillStyle = "rgba(238,246,255,0.75)";
    ctx.fillText("No chart data available for this asset yet.", padding.left, height / 2);
    return;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  function xFor(index) {
    return padding.left + (chartW / Math.max(points.length - 1, 1)) * index;
  }

  function yFor(value) {
    return padding.top + chartH - ((value - min) / range) * chartH;
  }

  const lineGradient = ctx.createLinearGradient(0, padding.top, width, padding.top);
  lineGradient.addColorStop(0, "#37a8ff");
  lineGradient.addColorStop(1, "#56f0ff");

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xFor(index);
    const y = yFor(point);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 3;
  ctx.stroke();

  const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  areaGradient.addColorStop(0, "rgba(86,240,255,0.20)");
  areaGradient.addColorStop(1, "rgba(86,240,255,0.00)");

  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = areaGradient;
  ctx.fill();

  const lastX = xFor(points.length - 1);
  const lastY = yFor(points[points.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#56f0ff";
  ctx.fill();

  ctx.fillStyle = "rgba(238,246,255,0.7)";
  ctx.fillText(money(max), width - padding.right + 8, padding.top + 4);
  ctx.fillText(money(min), width - padding.right + 8, height - padding.bottom);

  const eventMarkers = chartMarkersForAsset(asset.symbol).slice(0, 8);
  eventMarkers.forEach((event, index) => {
    const x = padding.left + chartW * ((index + 1) / (eventMarkers.length + 1));
    const future = Boolean(event.isFuture);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = future ? "rgba(255,209,102,0.78)" : "rgba(86,240,255,0.62)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = future ? "rgba(255,209,102,0.94)" : "rgba(86,240,255,0.9)";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillText(`${future ? "F" : "P"}${index + 1}`, x - 8, padding.top - 8);
  });

  ctx.fillStyle = "rgba(157,176,199,0.72)";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText("Oldest", padding.left, height - 14);
  ctx.fillText("Latest", width - padding.right - 35, height - 14);
}

function renderChartEvents(asset) {
  const markers = chartMarkersForAsset(asset.symbol);

  if (!markers.length) {
    els.chartEventsList.innerHTML = `<span>No important past/upcoming news markers for ${escapeHtml(asset.symbol)} yet.</span>`;
    return;
  }

  const past = markers.filter((event) => !event.isFuture);
  const future = markers.filter((event) => event.isFuture);

  function markerChip(event, index, group) {
    const label = group === "future" ? "Future" : "Past";
    return `<span class="chart-event-chip ${group}"><strong>${label} ${index + 1}</strong> ${escapeHtml(compact(event.title, 72))} • ${escapeHtml(event.category || "news")}</span>`;
  }

  els.chartEventsList.innerHTML = `
    ${past.map((event, index) => markerChip(event, index, "past")).join("")}
    ${future.map((event, index) => markerChip(event, index, "future")).join("")}
  `;
}

function renderChart() {
  const symbol = state.selectedChartSymbol || els.chartAssetSelect.value || state.assets[0]?.symbol;
  const asset = state.assets.find((item) => item.symbol === symbol);

  if (!asset) {
    els.chartAssetTitle.textContent = "No asset selected";
    return;
  }

  const live = asset.liveQuote || {};
  const hasLivePrice = live.price !== null && live.price !== undefined;
  const price = hasLivePrice ? live.price : asset.mockPrice;
  const change = hasLivePrice ? live.changePct : asset.mockChangePct;
  const source = live.source || "mock";

  els.chartAssetTitle.textContent = `${asset.name} (${asset.displaySymbol || asset.symbol})`;
  els.chartAssetSubtitle.textContent = asset.category === "metals"
    ? "Metal spot view. Gold/Silver are not labeled as GLD/SLV ETF proxy prices."
    : "Basic MVP chart using seeded sparkline data with live quote overlay when available.";
  els.chartPrice.textContent = money(price);
  els.chartChange.textContent = pct(change);
  els.chartChange.className = Number(change) >= 0 ? "up" : "down";
  els.chartSource.textContent = providerLabel(source);
  els.chartLastUpdated.textContent = live.timestamp ? `Last updated: ${formatTime(live.timestamp)}` : "Last updated: local mock data";
  els.chartMode.textContent = hasLivePrice
    ? `Mode: ${providerDetail(source, live.providerSymbol)}`
    : "Mode: seeded chart points";

  drawAssetChart(asset);
  renderChartEvents(asset);
}

function selectChartAsset(symbol) {
  state.selectedChartSymbol = symbol;
  els.chartAssetSelect.value = symbol;
  renderChart();
  document.querySelector(".chart-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function predictionMain(prediction) {
  const confidence = Math.round(Number(prediction.mainPrediction?.confidence ?? prediction.confidence ?? 0));
  const expectedMovePct = Number(prediction.mainPrediction?.expectedMovePct ?? prediction.expectedMovePct ?? 0);
  const riskLevel = prediction.mainPrediction?.riskLevel || prediction.riskLevel || "Watch";
  const assetSymbol = prediction.mainPrediction?.assetSymbol || prediction.assetSymbol || "ASSET";

  return {
    confidence,
    expectedMovePct,
    riskLevel,
    assetSymbol,
    moveText: pct(expectedMovePct),
    directionClass: expectedMovePct >= 0 ? "positive" : "negative",
    text: prediction.mainPrediction?.text || `${assetSymbol}: ${pct(expectedMovePct)}, ${riskLevel}, ${confidence}% sure`
  };
}

function getEventTitle(eventId) {
  return getSelectableEvent(eventId)?.title || state.events.find((event) => event.id === eventId)?.title || "Selected market event";
}

function selectedPredictionPlaceholder() {
  const eventTitle = els.eventSelect?.selectedOptions?.[0]?.textContent || "an event";
  const assetTitle = els.assetSelect?.selectedOptions?.[0]?.textContent || "an asset";

  els.predictionsGrid.innerHTML = `
    <article class="card prediction-card placeholder-card compact-placeholder">
      <div>
        <span class="eyebrow">Ready</span>
        <h3>No prediction generated yet</h3>
        <p>${escapeHtml(eventTitle)} → ${escapeHtml(assetTitle)}</p>
      </div>
      <button class="small-btn" type="button" onclick="document.querySelector('#generatePredictionBtn').click()">Generate</button>
    </article>
  `;
}

function sourceChipClass(source) {
  const clean = String(source || "").toLowerCase();
  if (clean.includes("gemini")) return "live";
  if (clean.includes("rule") || clean.includes("fallback") || clean.includes("mock")) return "mock";
  return "ok";
}

function directionLabel(move) {
  if (move > 0.05) return "Up bias";
  if (move < -0.05) return "Down bias";
  return "Flat / mixed";
}

function renderPredictions(prediction = null) {
  const predictions = prediction ? [prediction] : [];

  if (!predictions.length) {
    selectedPredictionPlaceholder();
    return;
  }

  els.predictionsGrid.innerHTML = predictions.map((prediction) => {
    const main = predictionMain(prediction);
    const eventTitle = getEventTitle(prediction.eventId);
    const sourceLabel = userFacingPredictionSource(prediction.source);
    const reasons = Array.isArray(prediction.reasoning) ? prediction.reasoning.slice(0, 2) : [];
    const history = compact(prediction.historicalComparison || "No strong historical match in seeded MVP data.", 110);

    return `
      <article class="card prediction-card selected-result-card compact-prediction-card">
        <div class="prediction-headline">
          <div>
            <span class="eyebrow">Focused Prediction</span>
            <h3>${escapeHtml(main.assetSymbol)} → ${escapeHtml(eventTitle)}</h3>
          </div>
          <span class="badge ${sourceChipClass(prediction.source)}">${escapeHtml(sourceLabel)}</span>
        </div>

        <div class="prediction-scoreboard">
          <div class="prediction-big ${main.directionClass}">
            <span>Expected move</span>
            <strong>${escapeHtml(main.moveText)}</strong>
          </div>
          <div><span>Direction</span><strong>${escapeHtml(directionLabel(main.expectedMovePct))}</strong></div>
          <div><span>Risk</span><strong>${escapeHtml(main.riskLevel)}</strong></div>
          <div><span>Confidence</span><strong>${escapeHtml(main.confidence)}%</strong></div>
        </div>

        <div class="prediction-quick-grid">
          <div>
            <h4>Why it matters</h4>
            <ul>
              ${(reasons.length ? reasons : [prediction.summary || "Market reaction depends on surprise and liquidity."]).map((reason) => `<li>${escapeHtml(compact(reason, 115))}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h4>History</h4>
            <p>${escapeHtml(history)}</p>
            <div class="meta-list prediction-tags">
              <span>${escapeHtml(prediction.label || "uncertain")}</span>
              <span>${escapeHtml(prediction.volatility || "medium")} volatility</span>
            </div>
          </div>
        </div>

        <div class="prediction-disclaimer">Educational only. Not financial advice. Not a buy/sell signal.</div>
      </article>
    `;
  }).join("");
}

function clearSelectedPrediction() {
  state.selectedPrediction = null;
  renderPredictions(null);
}

function deterministicValue(seed, min, max) {
  const hash = hashText(seed);
  return min + (hash % (max - min + 1));
}

function deterministicMove(seed) {
  const hash = hashText(seed);
  const raw = ((hash % 260) - 130) / 100;
  return Number((raw === 0 ? 0.11 : raw).toFixed(2));
}

function autoReviewFromNews(article, symbol) {
  const seed = `${article.id || article.title}_${symbol}`;
  const move = deterministicMove(seed);
  const direction = move > 0.05 ? "up" : move < -0.05 ? "down" : "flat";
  const accuracy = deterministicValue(seed, 61, 92);

  return {
    id: `auto_news_review_${hashText(seed)}`,
    assetSymbol: symbol,
    eventTitle: article.title || "Past market headline",
    predictedLabel: article.impactLevel === "high" ? "volatile" : article.impactLevel === "medium" ? "watch" : "small impact",
    actualDirection: direction,
    actualChangePct: move,
    accuracyPct: accuracy,
    eventTime: article.eventTime || article.publishedAt,
    reviewType: article.isLiveNews ? "Live-news MVP review" : "News/calendar MVP review",
    lesson: compact(article.impactReason || article.description || "Past news was reviewed against the simulated post-event move.", 135)
  };
}

function combinedReviews() {
  const base = Array.isArray(state.reviews) ? [...state.reviews] : [];
  const now = Date.now();
  const generated = [];

  state.news
    .filter((article) => articleDateValue(article).getTime() <= now)
    .forEach((article) => {
      const importantEnough = isImportantMarketItem(article) || article.sourceMode?.includes("seeded") || article.isLiveNews;
      if (!importantEnough) return;
      const assets = assetHintsForArticle(article).slice(0, 3);
      assets.forEach((symbol) => generated.push(autoReviewFromNews(article, symbol)));
    });

  const seen = new Set();
  return [...base, ...generated]
    .filter((review) => {
      const key = `${review.assetSymbol}_${review.eventTitle}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.eventTime || 0) - new Date(a.eventTime || 0));
}

function renderReviews() {
  const reviews = combinedReviews();

  if (!reviews.length) {
    els.reviewsGrid.innerHTML = `
      <article class="card">
        <span class="badge mock">Waiting</span>
        <h3>No completed reviews yet</h3>
        <p>Past calendar/news items will appear here with MVP accuracy scores.</p>
      </article>
    `;
    els.reviewAvg.textContent = "--";
    return;
  }

  els.reviewsGrid.innerHTML = reviews.map((review) => `
    <article class="card review-card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(review.assetSymbol)} Review</h3>
          <p>${escapeHtml(compact(review.eventTitle, 76))}</p>
        </div>
        <span class="badge ok">${escapeHtml(review.accuracyPct)}%</span>
      </div>
      <div class="review-mini-score">
        <div><span>Predicted</span><strong>${escapeHtml(review.predictedLabel)}</strong></div>
        <div><span>Actual</span><strong>${escapeHtml(review.actualDirection)}</strong></div>
        <div><span>Move</span><strong>${pct(review.actualChangePct)}</strong></div>
      </div>
      <p>${escapeHtml(review.lesson)}</p>
      <div class="meta-list"><span>${escapeHtml(review.reviewType || "Historical review")}</span></div>
    </article>
  `).join("");

  const average = reviews.length
    ? Math.round(reviews.reduce((sum, item) => sum + Number(item.accuracyPct || 0), 0) / reviews.length)
    : 0;
  els.reviewAvg.textContent = `${average}%`;
}

async function checkBackend() {
  try {
    const health = await apiGet("/health");
    els.backendStatus.textContent = `Backend OK • Gemini: ${health.env.GEMINI_API_KEY ? "configured" : "fallback"}`;
    els.backendStatus.className = "status-pill ok";
  } catch (error) {
    els.backendStatus.textContent = "Backend offline";
    els.backendStatus.className = "status-pill bad";
  }
}

async function loadDashboard() {
  document.body.classList.add("loading");
  try {
    const [assets, events, predictions, reviews] = await Promise.all([
      apiGet("/assets"),
      apiGet("/events"),
      apiGet("/predictions"),
      apiGet("/reviews")
    ]);

    state.assets = assets.data;
    state.events = events.data;
    state.predictions = predictions.data;
    state.reviews = reviews.data;

    renderFilters();
    renderAssets();
    renderEvents();
    renderPredictions();
    renderReviews();
    renderChart();
  } catch (error) {
    els.testConsole.textContent = `Dashboard load failed: ${error.message}`;
  } finally {
    document.body.classList.remove("loading");
  }
}

async function refreshPrices() {
  els.refreshPricesBtn.textContent = "Refreshing...";
  try {
    const symbols = state.assets.map((asset) => asset.symbol).join(",");
    const quotes = await apiGet(`/market/quotes?symbols=${encodeURIComponent(symbols)}`);
    state.assets = state.assets.map((asset) => ({
      ...asset,
      liveQuote: quotes.data.find((quote) => quote.symbol === asset.symbol) || null
    }));
    renderAssets();
    renderChart();
    els.testConsole.textContent = `Price refresh completed for ${quotes.data.length} assets. Metals use Alpha Vantage spot logic when available.`;
  } catch (error) {
    els.testConsole.textContent = `Price refresh failed: ${error.message}`;
  } finally {
    els.refreshPricesBtn.textContent = "Refresh Live/Mock Prices";
  }
}

async function generatePredictionCard() {
  const selectedOptionId = els.eventSelect.value;
  const assetSymbol = els.assetSelect.value;
  const selectedEvent = getSelectableEvent(selectedOptionId);
  els.generatePredictionBtn.textContent = "Generating...";

  try {
    const payload = selectedEvent?.isVirtualNews
      ? {
        assetSymbol,
        customEvent: {
          ...selectedEvent,
          affectedAssets: selectedEvent.affectedAssets?.length ? selectedEvent.affectedAssets : [assetSymbol],
          assetHints: selectedEvent.assetHints?.length ? selectedEvent.assetHints : [assetSymbol]
        }
      }
      : { eventId: selectedEvent?.id || selectedOptionId, assetSymbol };

    const result = await apiPost("/predictions/generate", payload);
    state.selectedPrediction = result.data;
    state.selectedChartSymbol = result.data.assetSymbol;
    els.chartAssetSelect.value = result.data.assetSymbol;
    renderPredictions(state.selectedPrediction);
    renderChart();
    const main = predictionMain(result.data);
    const eventTitle = getEventTitle(result.data.eventId) || selectedEvent?.title;
    els.testConsole.textContent = `Generated focused prediction: ${eventTitle} → ${main.text}\nSource event: ${selectedEvent?.isVirtualNews ? "Live/Small News" : "Calendar"}\n\n${JSON.stringify(result.data, null, 2)}`;
  } catch (error) {
    els.testConsole.textContent = `Prediction failed: ${error.message}`;
  } finally {
    els.generatePredictionBtn.textContent = "Generate Main Prediction";
  }
}

async function runEndpointTests() {
  const tests = [
    ["Health", "/health"],
    ["Fast API Status", "/ai/status"],
    ["Provider Probe", "/ai/status?probe=true"],
    ["Assets", "/assets"],
    ["Assets with Live Quotes", "/assets?live=true"],
    ["Events", "/events"],
    ["Predictions", "/predictions"],
    ["Reviews", "/reviews"],
    ["Review Summary", "/reviews/summary"],
    ["Quote GOLD", "/market/quote/GOLD"],
    ["Quote SILVER", "/market/quote/SILVER"],
    ["Quote SPY", "/market/quote/SPY"],
    ["Quotes", "/market/quotes?symbols=GOLD,SILVER,BTC,SPY"],
    ["Combined Feed 30d", "/news?query=gold&pageSize=45"],
    ["Small + Important Feed", "/news?query=Trump%20speech%20Fed%20remarks%20market&pageSize=45"],
    ["Macro Overview", "/macro/overview"],
    ["FRED CPI", "/macro/fred/CPIAUCSL"],
    ["EIA Oil", "/macro/energy/oil"]
  ];

  els.testConsole.textContent = "Running tests...\n";
  const lines = [];

  for (const [name, path] of tests) {
    try {
      const result = await apiGet(path);
      lines.push(`PASS ${name}: ${path} | keys=${Object.keys(result.data || result).join(",")}`);
    } catch (error) {
      lines.push(`FAIL ${name}: ${path} | ${error.message}`);
    }
  }

  try {
    const eventId = state.events[0]?.id || "evt_cpi_us_001";
    const assetSymbol = state.assets[0]?.symbol || "GOLD";
    const result = await apiPost("/predictions/generate", { eventId, assetSymbol });
    const main = predictionMain(result.data);
    lines.push(`PASS Generate Main Prediction: ${main.text}`);
  } catch (error) {
    lines.push(`FAIL Generate Prediction: ${error.message}`);
  }

  els.testConsole.textContent = lines.join("\n");
}

els.reloadDashboardBtn.addEventListener("click", () => {
  checkBackend();
  loadApiStatus(false);
  loadDashboard();
  loadNews();
});
els.runTestsBtn.addEventListener("click", runEndpointTests);
els.refreshApiStatusBtn.addEventListener("click", () => loadApiStatus(true));
els.refreshNewsBtn?.addEventListener("click", loadNews);
els.newsQueryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadNews();
});
els.refreshPricesBtn.addEventListener("click", refreshPrices);
els.refreshChartBtn.addEventListener("click", renderChart);
els.generatePredictionBtn.addEventListener("click", generatePredictionCard);
els.assetFilter.addEventListener("change", renderMarketFeed);
els.categoryFilter.addEventListener("change", renderMarketFeed);
els.feedTypeFilter?.addEventListener("change", renderMarketFeed);
els.eventSelect.addEventListener("change", clearSelectedPrediction);
els.assetSelect.addEventListener("change", clearSelectedPrediction);
els.chartAssetSelect.addEventListener("change", (event) => selectChartAsset(event.target.value));
window.addEventListener("resize", () => renderChart());

checkBackend();
loadApiStatus(false);
loadDashboard();
loadNews();

// Keep the Market Intelligence Feed fresh during demos without requiring a full page reload.
setInterval(() => loadNews(), 30 * 60 * 1000);
