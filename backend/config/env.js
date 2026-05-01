import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const PORT = Number(process.env.PORT || 5000);
export const NODE_ENV = process.env.NODE_ENV || "development";

export const API_KEYS = {
  FRED: process.env.FRED_API_KEY || "",
  FINNHUB: process.env.FINNHUB_API_KEY || "",
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY || "",
  NEWS: process.env.NEWS_API_KEY || "",
  GEMINI: process.env.GEMINI_API_KEY || "",
  EIA: process.env.EIA_API_KEY || ""
};

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export function getEnvStatus() {
  return {
    FRED_API_KEY: Boolean(API_KEYS.FRED),
    FINNHUB_API_KEY: Boolean(API_KEYS.FINNHUB),
    ALPHA_VANTAGE_API_KEY: Boolean(API_KEYS.ALPHA_VANTAGE),
    NEWS_API_KEY: Boolean(API_KEYS.NEWS),
    GEMINI_API_KEY: Boolean(API_KEYS.GEMINI),
    EIA_API_KEY: Boolean(API_KEYS.EIA)
  };
}
