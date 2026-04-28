import { getAssets, getEvents, getPredictions } from "../services/dataStore.service.js";
import { generatePrediction } from "../services/prediction.service.js";

function normalizeCustomEvent(customEvent = {}, assetSymbol = "") {
  const now = new Date().toISOString();
  const cleanAsset = String(assetSymbol || "").toUpperCase();
  const affectedAssets = Array.isArray(customEvent.affectedAssets)
    ? customEvent.affectedAssets.map((item) => String(item).toUpperCase())
    : Array.isArray(customEvent.assetHints)
      ? customEvent.assetHints.map((item) => String(item).toUpperCase())
      : [];

  if (cleanAsset && !affectedAssets.includes(cleanAsset)) affectedAssets.unshift(cleanAsset);

  return {
    id: customEvent.id || `custom_news_${Date.now()}`,
    title: customEvent.title || "Selected live market news",
    description: customEvent.description || customEvent.impactReason || "Live/small market headline selected from the Market Intelligence Feed section.",
    category: customEvent.category || "live_news",
    eventTime: customEvent.eventTime || customEvent.publishedAt || now,
    importance: customEvent.importance || customEvent.impactLevel || "medium",
    status: customEvent.status || "published",
    region: customEvent.region || "global",
    source: customEvent.source?.name || customEvent.source || customEvent.sourceMode || "Market Intelligence Feed",
    affectedAssets,
    isCustomNews: true,
    url: customEvent.url || null
  };
}

export async function listPredictions(req, res) {
  try {
    const { eventId, asset } = req.query;
    let predictions = await getPredictions();

    if (eventId) {
      predictions = predictions.filter((prediction) => prediction.eventId === eventId);
    }

    if (asset && asset !== "all") {
      predictions = predictions.filter((prediction) => prediction.assetSymbol === String(asset).toUpperCase());
    }

    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load predictions", error: error.message });
  }
}

export async function createPrediction(req, res) {
  try {
    const { eventId, assetSymbol, customEvent } = req.body || {};

    if (!assetSymbol) {
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
    const symbol = String(assetSymbol).toUpperCase();
    const asset = assets.find((item) => item.symbol === symbol);

    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    let event = null;

    if (customEvent) {
      event = normalizeCustomEvent(customEvent, symbol);
    } else {
      const events = await getEvents();
      event = events.find((item) => item.id === eventId);
      if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    }

    const prediction = await generatePrediction({ event, asset });

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate prediction", error: error.message });
  }
}
