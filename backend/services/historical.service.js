import { getHistoricalMatches } from "./dataStore.service.js";

export async function findHistoricalMatches(event = {}, assetSymbol = "") {
  const all = await getHistoricalMatches();
  const category = String(event.category || "").toLowerCase();
  const symbol = String(assetSymbol || "").toUpperCase();

  return all
    .filter((item) => {
      const sameCategory = String(item.eventCategory || "").toLowerCase() === category;
      const sameAsset = String(item.assetSymbol || "").toUpperCase() === symbol;
      return sameCategory || sameAsset;
    })
    .sort((a, b) => Number(b.similarityScore || 0) - Number(a.similarityScore || 0))
    .slice(0, 3);
}
