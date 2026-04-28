import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

export async function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function writeJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

export async function getAssets() {
  return readJson("assets.json");
}

export async function getEvents() {
  return readJson("events.json");
}

export async function getPredictions() {
  return readJson("predictions.json");
}

export async function getReviews() {
  return readJson("mock_reviews.json");
}

export async function getHistoricalMatches() {
  return readJson("historical_matches.json");
}
