import { getReviews } from "../services/dataStore.service.js";

export async function listReviews(req, res) {
  try {
    const { asset } = req.query;
    let reviews = await getReviews();

    if (asset && asset !== "all") {
      reviews = reviews.filter((review) => review.assetSymbol === String(asset).toUpperCase());
    }

    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load reviews", error: error.message });
  }
}

export async function reviewSummary(req, res) {
  try {
    const reviews = await getReviews();
    const avgAccuracy = reviews.length
      ? Math.round(reviews.reduce((sum, review) => sum + Number(review.accuracyPct || 0), 0) / reviews.length)
      : 0;

    res.json({
      success: true,
      data: {
        totalReviews: reviews.length,
        averageAccuracyPct: avgAccuracy,
        message: "MVP review summary uses seeded historical examples."
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load review summary", error: error.message });
  }
}
