import { getEvents } from "../services/dataStore.service.js";

export async function listEvents(req, res) {
  try {
    const { asset, category, importance, status } = req.query;
    let events = await getEvents();

    if (asset && asset !== "all") {
      const symbol = String(asset).toUpperCase();
      events = events.filter((event) => event.affectedAssets.includes(symbol));
    }

    if (category && category !== "all") {
      events = events.filter((event) => event.category.toLowerCase() === String(category).toLowerCase());
    }

    if (importance && importance !== "all") {
      events = events.filter((event) => event.importance.toLowerCase() === String(importance).toLowerCase());
    }

    if (status && status !== "all") {
      events = events.filter((event) => event.status.toLowerCase() === String(status).toLowerCase());
    }

    events.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));

    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load events", error: error.message });
  }
}

export async function getEventById(req, res) {
  try {
    const events = await getEvents();
    const event = events.find((item) => item.id === req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load event", error: error.message });
  }
}
