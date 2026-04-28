export async function safeFetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 9000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.message || data?.error || `HTTP ${response.status}`,
        data
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.name === "AbortError" ? "Request timed out" : error.message,
      data: null
    };
  } finally {
    clearTimeout(timer);
  }
}
