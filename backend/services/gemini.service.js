import { API_KEYS, GEMINI_MODEL } from "../config/env.js";
import { safeFetchJson } from "../utils/safeFetch.js";

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("\n").trim();
}

export async function askGemini(prompt) {
  if (!API_KEYS.GEMINI) {
    return {
      source: "mock",
      text: "Gemini key is missing. Using rule-based MVP reasoning instead.",
      usedGemini: false
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEYS.GEMINI}`;

  const result = await safeFetchJson(url, {
    method: "POST",
    timeoutMs: 15000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 700,
        responseMimeType: "application/json"
      }
    })
  });

  if (!result.ok) {
    return {
      source: "fallback_rules_after_ai_error",
      text: `Gemini request failed: ${result.error}. Using rule-based MVP reasoning instead.`,
      usedGemini: false,
      error: result.error
    };
  }

  return {
    source: "gemini",
    text: extractGeminiText(result.data),
    usedGemini: true
  };
}
