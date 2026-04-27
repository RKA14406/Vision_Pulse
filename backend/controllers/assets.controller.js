import { getAssets } from "../services/dataStore.service.js";
import { getQuotes } from "../services/market.service.js";

export async function listAssets(req, res) {
  try {
    const { category, live } = req.query;
    let assets = await getAssets();

    if (category && category !== "all") {
      assets = assets.filter((asset) => asset.category.toLowerCase() === String(category).toLowerCase());
    }

    if (String(live).toLowerCase() === "true") {
      const quotes = await getQuotes(assets.map((asset) => asset.symbol));
      assets = assets.map((asset) => ({
        ...asset,
        liveQuote: quotes.find((quote) => quote.symbol === asset.symbol) || null
      }));
    }

    res.json({ success: true, count: assets.length, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load assets", error: error.message });
  }
}

export async function getAssetBySymbol(req, res) {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const assets = await getAssets();
    const asset = assets.find((item) => item.symbol === symbol);

    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load asset", error: error.message });
  }
}
