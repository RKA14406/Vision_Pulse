import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { NODE_ENV, PORT, getEnvStatus } from "./config/env.js";

import assetsRoutes from "./routes/assets.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import predictionsRoutes from "./routes/predictions.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import marketRoutes from "./routes/market.routes.js";
import newsRoutes from "./routes/news.routes.js";
import macroRoutes from "./routes/macro.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "../frontend");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    project: "VisionPulse AI",
    status: "healthy",
    mode: NODE_ENV,
    timestamp: new Date().toISOString(),
    env: getEnvStatus(),
    message: "Backend is running. Missing API keys automatically use seeded/mock data."
  });
});

app.use("/api/assets", assetsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/predictions", predictionsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/macro", macroRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api", (req, res) => {
  res.json({
    success: true,
    name: "VisionPulse AI API",
    endpoints: [
      "GET /api/health",
      "GET /api/assets",
      "GET /api/events",
      "GET /api/predictions",
      "POST /api/predictions/generate",
      "GET /api/reviews",
      "GET /api/reviews/summary",
      "GET /api/market/quote/:symbol",
      "GET /api/market/quotes?symbols=GOLD,BTC,SPY",
      "GET /api/news?query=gold&pageSize=5",
      "GET /api/macro/overview",
      "GET /api/macro/fred/CPIAUCSL",
      "GET /api/macro/energy/oil",
      "GET /api/ai/status"
    ]
  });
});

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: "Unexpected server error", error: error.message });
});

app.listen(PORT, () => {
  console.log(`VisionPulse AI running on http://localhost:${PORT}`);
});
