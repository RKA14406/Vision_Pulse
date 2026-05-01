import { getMarketNews } from "../services/news.service.js";

export async function listNews(req, res) {
  try {
    const query = req.query.query || "financial markets";
    const pageSize = req.query.pageSize || 6;
    const data = await getMarketNews(query, pageSize);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load news", error: error.message });
  }
}
