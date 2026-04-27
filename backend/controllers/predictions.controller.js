import { getAssets, getEvents, getPredictions } from "../services/dataStore.service.js";
import { generatePrediction } from "../services/prediction.service.js";

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
    const { eventId, assetSymbol } = req.body || {};

    if (!eventId || !assetSymbol) {
      return res.status(400).json({
        success: false,
        message: "eventId and assetSymbol are required"
      });
    }

    const events = await getEvents();
    const assets = await getAssets();
    const event = events.find((item) => item.id === eventId);
    const asset = assets.find((item) => item.symbol === String(assetSymbol).toUpperCase());

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    const prediction = await generatePrediction({ event, asset });

    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate prediction", error: error.message });
  }
}
