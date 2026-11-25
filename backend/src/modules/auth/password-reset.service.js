const crypto = require("crypto");
const bcrypt = require("bcrypt");

const repository = require("./password-reset.repository");

const {
  sendPasswordResetOtp,
} = require("../../integrations/email.service");

const otpSecret = process.env.OTP_SECRET;

if (!otpSecret || Buffer.byteLength(otpSecret, "utf8") < 32) {
  throw new Error(
    "OTP_SECRET must contain at least 32 bytes. Check .env."
  );
}

function hashOtp(userId, otp) {
  return crypto
    .createHmac("sha256", otpSecret)
    .update(`${userId}:${otp}`)
    .digest("hex");
}

function otpMatches(userId, submittedOtp, storedHash) {
  const submitted = Buffer.from(
    hashOtp(userId, submittedOtp),
    "hex"
  );

  const stored = Buffer.from(storedHash, "hex");

  return (
    submitted.length === stored.length &&
    crypto.timingSafeEqual(submitted, stored)
  );
}

function canResetPassword(user) {
  return (
    user &&
    ["active", "pending"].includes(user.status)
  );
}

async function requestPasswordReset(email) {
  const delivery = await repository.withResetUser(
    email,
    async (user, client) => {
      if (!canResetPassword(user)) {
        return null;
      }

      const allowed = await repository.canIssueOtp(
        client,
        user.id
      );

      if (!allowed) {
        return null;
      }

      const otp = String(
        crypto.randomInt(100000, 1000000)
      );

      const otpHash = hashOtp(user.id, otp);

      await repository.invalidateUserOtps(client, user.id);

      const record = await repository.createOtp(
        client,
        user.id,
        otpHash
      );

      return {
        otpId: record.id,
        email: user.email,
        otp,
      };
    }
  );

  if (!delivery) {
    return;
  }

  try {
    await sendPasswordResetOtp(
      delivery.email,
      delivery.otp
    );
  } catch (error) {
    // A code that could not be delivered must not remain usable.
    await repository.invalidateOtpById(delivery.otpId);
    throw error;
  }
}

async function resetPassword(data) {
  const passwordHash = await bcrypt.hash(
    data.new_password,
    12
  );

  return repository.withResetUser(
    data.email,
    async (user, client) => {
      if (!canResetPassword(user)) {
        return false;
      }

      const record = await repository.findLatestOtp(
        client,
        user.id
      );

      if (
        !record ||
        record.used_at ||
        !record.is_valid ||
        record.attempts >= 5
      ) {
        return false;
      }

      if (!otpMatches(user.id, data.otp, record.otp_hash)) {
        await repository.recordWrongOtp(client, record.id);
        return false;
      }

      return repository.applyPasswordReset(
        client,
        user.id,
        record.id,
        passwordHash
      );
    }
  );
}

module.exports = {
  requestPasswordReset,
  resetPassword,
};