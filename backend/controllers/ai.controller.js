import { API_KEYS } from "../config/env.js";

export async function aiStatus(req, res) {
  res.json({
    success: true,
    data: {
      geminiConfigured: Boolean(API_KEYS.GEMINI),
      mode: API_KEYS.GEMINI ? "Gemini enabled" : "Rule-based fallback enabled",
      message: "POST /api/predictions/generate to create a prediction card."
    }
  });
}
