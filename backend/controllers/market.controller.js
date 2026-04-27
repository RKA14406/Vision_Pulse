import { getQuote, getQuotes } from "../services/market.service.js";

export async function quote(req, res) {
  try {
    const symbol = req.params.symbol;
    const provider = req.query.provider || "auto";
    const data = await getQuote(symbol, provider);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load quote", error: error.message });
  }
}

export async function quotes(req, res) {
  try {
    const symbols = String(req.query.symbols || "GOLD,SILVER,BTC,ETH,OIL,SPY,QQQ,NVDA").split(",");
    const data = await getQuotes(symbols);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load quotes", error: error.message });
  }
}
