const crypto = require("node:crypto");
function encryptionKey() {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key))
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be 64 hexadecimal characters.",
    );
  return Buffer.from(key, "hex");
}
function encryptSecret(name, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(name, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}
function decryptSecret(name, encoded) {
  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== "v1")
    throw new Error("Unsupported encrypted setting format.");
  const [, iv, tag, ciphertext] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAAD(Buffer.from(name, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
module.exports = { encryptionKey, encryptSecret, decryptSecret };
