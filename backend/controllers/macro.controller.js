import { getFredSeries, getMacroOverview } from "../services/macro.service.js";
import { getOilSnapshot } from "../services/eia.service.js";

export async function macroOverview(req, res) {
  try {
    const data = await getMacroOverview();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load macro overview", error: error.message });
  }
}

export async function fredSeries(req, res) {
  try {
    const data = await getFredSeries(req.params.seriesId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load FRED series", error: error.message });
  }
}

export async function oilSnapshot(req, res) {
  try {
    const data = await getOilSnapshot();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load oil snapshot", error: error.message });
  }
}
