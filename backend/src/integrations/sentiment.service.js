const BERT_SERVICE_URL =
  process.env.BERT_SERVICE_URL || "http://localhost:8001";

async function analyzeWithBert(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${BERT_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`BERT service status ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn("BERT fallback triggered:", err.message);
    return {
      sentiment_label: "NEUTRAL",
      confidence_score: 0.5,
      model_version: "fallback-offline",
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { analyzeWithBert };