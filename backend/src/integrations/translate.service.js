const crypto = require("crypto");
const pool = require("../config/db");

async function translateText(text, targetLang) {
  if (!targetLang || targetLang === "en") return text;

  const sourceHash = crypto
    .createHash("md5")
    .update(`${targetLang}:${text}`)
    .digest("hex");

  const cached = await pool.query(
    `SELECT translated_text FROM translation_cache WHERE source_hash = $1`,
    [sourceHash]
  );
  if (cached.rowCount > 0) {
    return cached.rows[0].translated_text;
  }

  let translated = text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.slice(0, 450)
    )}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.responseData?.translatedText) {
      translated = data.responseData.translatedText;
    }
  } catch (err) {
    console.warn("Translation API unavailable, returning original text.");
  }

  await pool.query(
    `INSERT INTO translation_cache (source_hash, source_text, target_lang, translated_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_hash) DO NOTHING`,
    [sourceHash, text, targetLang, translated]
  );

  return translated;
}

module.exports = { translateText };