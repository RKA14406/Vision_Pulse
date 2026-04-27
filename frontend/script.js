const API_BASE = "/api";

const state = {
  assets: [],
  events: [],
  predictions: [],
  selectedPrediction: null,
  reviews: []
};

const els = {
  backendStatus: document.querySelector("#backendStatus"),
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
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: Number(value) > 100 ? 2 : 4 });
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

function formatTime(value) {
  if (!value) return "Seeded local data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Seeded local data";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function providerLabel(source) {
  const clean = String(source || "mock").toLowerCase();
  if (clean === "mock" || clean === "seeded") return "Mock fallback";
  if (clean.includes("fallback")) return "Rule fallback";
  if (clean.includes("gemini")) return "Gemini + Rules";
  if (clean.includes("alpha")) return "Live API";
  if (clean.includes("finnhub")) return "Live API";
  return "Live/API";
}

function providerDetail(source, providerSymbol) {
  const clean = String(source || "mock").toLowerCase();
  if (clean === "mock" || clean === "seeded") return "Seeded mock price";
  if (clean.includes("fallback")) return "Rule engine backup";
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

function renderAssets() {
  els.assetsGrid.innerHTML = state.assets.map((asset) => {
    const live = asset.liveQuote || {};
    const hasLivePrice = live.price !== null && live.price !== undefined;
    const price = hasLivePrice ? live.price : asset.mockPrice;
    const change = hasLivePrice ? live.changePct : asset.mockChangePct;
    const upDown = Number(change) >= 0 ? "up" : "down";
    const source = live.source || "mock";
    const isLive = hasLivePrice && !["mock", "seeded"].includes(String(source).toLowerCase());
    const lastUpdated = live.timestamp ? `Last updated: ${formatTime(live.timestamp)}` : "Last updated: local mock";

    return `
      <article class="card asset-card" data-symbol="${escapeHtml(asset.symbol)}">
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

  els.assetCount.textContent = state.assets.length;
}

function renderFilters() {
  els.assetFilter.innerHTML = `<option value="all">All assets</option>` + state.assets
    .map((asset) => `<option value="${escapeHtml(asset.symbol)}">${escapeHtml(asset.name)}</option>`)
    .join("");

  els.assetSelect.innerHTML = state.assets
    .map((asset) => `<option value="${escapeHtml(asset.symbol)}">${escapeHtml(asset.name)} (${escapeHtml(asset.symbol)})</option>`)
    .join("");

  els.eventSelect.innerHTML = state.events
    .map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.title)}</option>`)
    .join("");
}

function renderEvents() {
  const selectedAsset = els.assetFilter.value;
  const selectedCategory = els.categoryFilter.value;

  const filtered = state.events.filter((event) => {
    const assetMatch = selectedAsset === "all" || event.affectedAssets.includes(selectedAsset);
    const categoryMatch = selectedCategory === "all" || event.category === selectedCategory;
    return assetMatch && categoryMatch;
  });

  els.eventsGrid.innerHTML = filtered.map((event) => `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${new Date(event.eventTime).toLocaleString()}</p>
        </div>
        <span class="badge ${escapeHtml(event.importance)}">${escapeHtml(event.importance)}</span>
      </div>
      <p>${escapeHtml(event.description)}</p>
      <div class="meta-list">
        <span>${escapeHtml(event.category)}</span>
        <span>${escapeHtml(event.region)}</span>
        <span>${escapeHtml(event.status)}</span>
      </div>
      <div class="meta-list">
        ${event.affectedAssets.map((symbol) => `<span>${escapeHtml(symbol)}</span>`).join("")}
      </div>
    </article>
  `).join("");

  els.eventCount.textContent = state.events.length;
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
  return state.events.find((event) => event.id === eventId)?.title || "Selected market event";
}

function selectedPredictionPlaceholder() {
  const eventTitle = els.eventSelect?.selectedOptions?.[0]?.textContent || "an event";
  const assetTitle = els.assetSelect?.selectedOptions?.[0]?.textContent || "an asset";

  els.predictionsGrid.innerHTML = `
    <article class="card prediction-card placeholder-card">
      <div class="card-top">
        <div>
          <h3>No active prediction yet</h3>
          <p>Selected pair: ${escapeHtml(eventTitle)} → ${escapeHtml(assetTitle)}</p>
        </div>
        <span class="badge mock">Waiting</span>
      </div>
      <p>
        Press <strong>Generate Main Prediction</strong> to create one focused card for this exact event + asset pair.
        Unrelated seeded demo cards are hidden here to avoid confusing the test flow.
      </p>
    </article>
  `;
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

    return `
      <article class="card prediction-card selected-result-card">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(prediction.assetSymbol)} Main Prediction</h3>
            <p>${escapeHtml(eventTitle)}</p>
          </div>
          <span class="badge ok">${escapeHtml(main.confidence)}% sure</span>
        </div>

        <div class="main-prediction ${main.directionClass}">
          <span>Main Prediction</span>
          <strong>${escapeHtml(main.assetSymbol)}: ${escapeHtml(main.moveText)}</strong>
          <em>${escapeHtml(main.riskLevel)} • ${escapeHtml(main.confidence)}% sure</em>
        </div>

        <p>${escapeHtml(prediction.summary || "AI prediction card")}</p>

        <div class="meta-list">
          <span>${escapeHtml(prediction.label)}</span>
          <span>${escapeHtml(prediction.volatility)} volatility</span>
          <span>${escapeHtml(userFacingPredictionSource(prediction.source))}</span>
        </div>
        <p><strong>Reasoning:</strong></p>
        <p>${(prediction.reasoning || []).map(escapeHtml).join(" ")}</p>
        ${prediction.historicalComparison ? `<p><strong>Historical:</strong> ${escapeHtml(prediction.historicalComparison)}</p>` : ""}
        <p><strong>Risk:</strong> ${escapeHtml(prediction.riskWarning || "Educational only. Not financial advice.")}</p>
      </article>
    `;
  }).join("");
}

function clearSelectedPrediction() {
  state.selectedPrediction = null;
  renderPredictions(null);
}

function renderReviews() {
  els.reviewsGrid.innerHTML = state.reviews.map((review) => `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(review.assetSymbol)} Review</h3>
          <p>${escapeHtml(review.eventTitle)}</p>
        </div>
        <span class="badge ok">${escapeHtml(review.accuracyPct)}%</span>
      </div>
      <div class="meta-list">
        <span>Predicted: ${escapeHtml(review.predictedLabel)}</span>
        <span>Actual: ${escapeHtml(review.actualDirection)}</span>
        <span>${pct(review.actualChangePct)}</span>
      </div>
      <p>${escapeHtml(review.lesson)}</p>
    </article>
  `).join("");

  const average = state.reviews.length
    ? Math.round(state.reviews.reduce((sum, item) => sum + Number(item.accuracyPct || 0), 0) / state.reviews.length)
    : 0;
  els.reviewAvg.textContent = `${average}%`;
}

async function checkBackend() {
  try {
    const health = await apiGet("/health");
    els.backendStatus.textContent = `Backend OK • Gemini: ${health.env.GEMINI_API_KEY ? "on" : "fallback"}`;
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
  } catch (error) {
    els.testConsole.textContent = `Price refresh failed: ${error.message}`;
  } finally {
    els.refreshPricesBtn.textContent = "Refresh Prices";
  }
}

async function generatePredictionCard() {
  const eventId = els.eventSelect.value;
  const assetSymbol = els.assetSelect.value;
  els.generatePredictionBtn.textContent = "Generating...";

  try {
    const result = await apiPost("/predictions/generate", { eventId, assetSymbol });
    state.selectedPrediction = result.data;
    renderPredictions(state.selectedPrediction);
    const main = predictionMain(result.data);
    const eventTitle = getEventTitle(result.data.eventId);
    els.testConsole.textContent = `Generated focused prediction only: ${eventTitle} → ${main.text}\n\n${JSON.stringify(result.data, null, 2)}`;
  } catch (error) {
    els.testConsole.textContent = `Prediction failed: ${error.message}`;
  } finally {
    els.generatePredictionBtn.textContent = "Generate Main Prediction";
  }
}

async function runEndpointTests() {
  const tests = [
    ["Health", "/health"],
    ["Assets", "/assets"],
    ["Events", "/events"],
    ["Predictions", "/predictions"],
    ["Reviews", "/reviews"],
    ["Review Summary", "/reviews/summary"],
    ["Quote GOLD", "/market/quote/GOLD"],
    ["Quotes", "/market/quotes?symbols=GOLD,BTC,SPY"],
    ["News", "/news?query=gold&pageSize=3"],
    ["Macro Overview", "/macro/overview"],
    ["FRED CPI", "/macro/fred/CPIAUCSL"],
    ["EIA Oil", "/macro/energy/oil"],
    ["AI Status", "/ai/status"]
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

els.reloadDashboardBtn.addEventListener("click", loadDashboard);
els.runTestsBtn.addEventListener("click", runEndpointTests);
els.refreshPricesBtn.addEventListener("click", refreshPrices);
els.generatePredictionBtn.addEventListener("click", generatePredictionCard);
els.assetFilter.addEventListener("change", renderEvents);
els.categoryFilter.addEventListener("change", renderEvents);
els.eventSelect.addEventListener("change", clearSelectedPrediction);
els.assetSelect.addEventListener("change", clearSelectedPrediction);

checkBackend();
loadDashboard();
