const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error(
    "JWT_SECRET must be configured with at least 32 bytes in .env."
  );
}

function createAccessToken(user) {
  return jwt.sign(
    {
      token_version: user.token_version,
    },
    secret,
    {
      algorithm: "HS256",
      subject: String(user.id),
      issuer: "dab-automotive",
      audience: "dab-api",
      expiresIn: "1h",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: "dab-automotive",
    audience: "dab-api",
  });
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
};