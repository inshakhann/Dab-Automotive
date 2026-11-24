const {
  verifyAccessToken,
} = require("../config/jwt");

const {
  findUserById,
} = require("../modules/auth/auth.repository");

async function authenticate(req, res, next) {
  const authorization = req.get("Authorization") || "";

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "A Bearer token is required.",
    });
  }

  let payload;

  try {
    payload = verifyAccessToken(match[1]);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }

  const userId = Number(payload.sub);

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    userId > 2147483647 ||
    !Number.isInteger(payload.token_version) ||
    payload.token_version < 0
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please log in again.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    if (user.token_version !== payload.token_version) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    // Attach safe, current account details to the request.
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      preferred_language: user.preferred_language,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;