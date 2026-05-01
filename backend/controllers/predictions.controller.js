import { getAssets, getEvents, getPredictions, savePrediction } from "../services/dataStore.service.js";
import { generatePrediction } from "../services/prediction.service.js";

function normalizeCustomEvent(customEvent = {}, assetSymbol = "") {
  const now = new Date().toISOString();
  const cleanAsset = String(assetSymbol || "").trim().toUpperCase();
  const affectedAssets = Array.isArray(customEvent.affectedAssets)
    ? customEvent.affectedAssets.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
    : Array.isArray(customEvent.assetHints)
      ? customEvent.assetHints.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
      : [];

  if (cleanAsset && !affectedAssets.includes(cleanAsset)) affectedAssets.unshift(cleanAsset);

  return {
    id: customEvent.id || customEvent.eventId || `custom_news_${Date.now()}`,
    title: customEvent.title || "Selected live market news",
    description: customEvent.description || customEvent.impactReason || "Live/small market headline selected from the Market Intelligence Feed section.",
    category: customEvent.category || "live_news",
    eventTime: customEvent.eventTime || customEvent.publishedAt || now,
    publishedAt: customEvent.publishedAt || customEvent.eventTime || now,
    importance: customEvent.importance || customEvent.impactLevel || "medium",
    status: customEvent.status || "published",
    region: customEvent.region || "global",
    source: customEvent.source?.name || customEvent.source || customEvent.sourceMode || "Market Intelligence Feed",
    affectedAssets,
    keywords: customEvent.keywords || [],
    isCustomNews: true,
    url: customEvent.url || null
  };
}

function buildEventTitleMap(events = []) {
  return new Map(events.map((event) => [String(event.id), event.title || "Selected market event"]));
}

function enrichPrediction(prediction = {}, eventTitleMap = new Map()) {
  const eventTitle = prediction.eventTitle || eventTitleMap.get(String(prediction.eventId)) || "Selected market event";
  const confidence = Number(prediction.confidence ?? 0);
  const confidencePct = Number.isFinite(Number(prediction.confidencePct))
    ? Number(prediction.confidencePct)
    : Math.round((confidence > 1 ? confidence / 100 : confidence) * 100);

  const expectedMovePct = Number.isFinite(Number(prediction.expectedMovePct))
    ? Number(prediction.expectedMovePct)
    : Number(prediction.mainPredictionData?.expectedMovePct ?? 0);

  const riskLevel = prediction.riskLevel || prediction.mainPredictionData?.riskLevel || "Watch";
  const asset = String(prediction.asset || prediction.assetSymbol || "UNKNOWN").toUpperCase();
  const mainPrediction = prediction.mainPrediction || `${asset}: ${expectedMovePct > 0 ? "+" : ""}${expectedMovePct.toFixed(2)}%, ${riskLevel}, ${confidencePct}% confidence`;

  return {
    ...prediction,
    eventTitle,
    asset,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    confidencePct,
    expectedMovePct,
    riskLevel,
    mainPrediction,
    summary: prediction.summary || prediction.prediction || mainPrediction,
    prediction: prediction.prediction || prediction.summary || mainPrediction,
    direction: prediction.direction || (expectedMovePct >= 0 ? "bullish" : "bearish"),
    status: prediction.status || "pending",
    source: prediction.source || "unknown",
    schemaVersion: prediction.schemaVersion || 1
  };
}

function parseLimit(value, fallback = 10) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), 100);
}

export async function listPredictions(req, res) {
  try {
    const { eventId, asset, status, source, direction } = req.query;
    const limit = parseLimit(req.query.limit, 10);

    const events = await getEvents();
    const eventTitleMap = buildEventTitleMap(events);
    let predictions = await getPredictions();

    predictions = predictions.map((prediction) => enrichPrediction(prediction, eventTitleMap));

    if (eventId) {
      predictions = predictions.filter((prediction) => prediction.eventId === String(eventId));
    }

    if (asset && asset !== "all") {
      predictions = predictions.filter((prediction) => prediction.asset === String(asset).toUpperCase());
    }

    if (status && status !== "all") {
      predictions = predictions.filter((prediction) => prediction.status === String(status).toLowerCase());
    }

    if (source && source !== "all") {
      const cleanSource = String(source).toLowerCase();
      predictions = predictions.filter((prediction) => String(prediction.source || "").toLowerCase().includes(cleanSource));
    }

    if (direction && direction !== "all") {
      predictions = predictions.filter((prediction) => prediction.direction === String(direction).toLowerCase());
    }

    predictions = predictions
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);

    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
      meta: {
        limit,
        filters: {
          eventId: eventId || null,
          asset: asset || "all",
          status: status || "all",
          source: source || "all",
          direction: direction || "all"
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load predictions", error: error.message });
  }
}

export async function createPrediction(req, res) {
  try {
    const { eventId, assetSymbol, customEvent } = req.body || {};
    const symbol = String(assetSymbol || "").trim().toUpperCase();

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "assetSymbol is required"
      });
    }

    if (!eventId && !customEvent) {
      return res.status(400).json({
        success: false,
        message: "eventId or customEvent is required"
      });
    }

    const assets = await getAssets();
    const asset = assets.find((item) => String(item.symbol).toUpperCase() === symbol);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset not found: ${symbol}`
      });
    }

    let event = null;

    if (customEvent) {
      event = normalizeCustomEvent(customEvent, symbol);
    } else {
      const events = await getEvents();
      event = events.find((item) => item.id === eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: `Event not found: ${eventId}`
        });
      }
    }

    const prediction = await generatePrediction({ event, asset });
    const saved = enrichPrediction(await savePrediction(prediction), new Map([[String(event.id), event.title]]));

    res.json({
      success: true,
      data: {
          prediction: saved
        },
      meta: {
        generatedFor: {
          eventId: event.id,
          eventTitle: event.title,
          asset: symbol,
          customEvent: Boolean(customEvent)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate prediction", error: error.message });
  }
}
