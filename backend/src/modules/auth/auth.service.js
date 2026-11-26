const bcrypt = require("bcrypt");
const authRepository = require("./auth.repository");
const { createAccessToken } = require("../../config/jwt");

async function registerUser(data) {
  const requestedRoleName = data.role || "customer";

  const customerRole = await authRepository.findRoleByName("customer");

  const requestedRole = await authRepository.findRoleByName(requestedRoleName);

  if (!customerRole || !requestedRole) {
    throw new Error("Required roles are missing. Run database migrations.");
  }

  const isStaffRequest = requestedRoleName !== "customer";

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await authRepository.createUser({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    password_hash: passwordHash,

    // Staff privileges are granted only after approval.
    role_id: customerRole.id,
    requested_role_id: isStaffRequest ? requestedRole.id : null,
    status: isStaffRequest ? "pending" : "active",
  });

  return {
    ...user,
    role: "customer",
    requested_role: isStaffRequest ? requestedRoleName : null,
  };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function loginFailure(status, message) {
  return {
    error: { status, message },
  };
}

async function loginUser(data) {
  const outcome = await authRepository.withLoginUser(
    data.email,
    async (user, client) => {
      if (!user) {
        return loginFailure(401, "Invalid email or password.");
      }

      const now = Date.now();

      const lockedUntil = user.locked_until
        ? new Date(user.locked_until).getTime()
        : null;

      // A locked account cannot log in, even with the right password.
      if (lockedUntil && lockedUntil > now) {
        return loginFailure(
          429,
          "Account temporarily locked. Please try again later.",
        );
      }

      // Start a fresh attempt count when an old lock has expired.
      const previousAttempts =
        lockedUntil && lockedUntil <= now ? 0 : user.failed_login_attempts;

      const passwordMatches = await bcrypt.compare(
        data.password,
        user.password_hash,
      );

      if (!passwordMatches) {
        const failedAttempts = previousAttempts + 1;

        const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

        const newLockedUntil = shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null;

        await authRepository.updateLoginState(
          client,
          user.id,
          failedAttempts,
          newLockedUntil,
        );

        if (shouldLock) {
          return loginFailure(
            429,
            "Too many incorrect passwords. Account locked for 15 minutes.",
          );
        }

        return loginFailure(401, "Invalid email or password.");
      }

      // Check account status only after verifying the password.
      if (user.status === "pending") {
        return loginFailure(403, "Your staff account is waiting for approval.");
      }

      if (user.status !== "active") {
        return loginFailure(
          403,
          "Your account is not active. Contact the administrator.",
        );
      }

      // Successful login clears earlier failed attempts.
      await authRepository.updateLoginState(client, user.id, 0, null);

      return { user };
    },
  );

  if (outcome.error) {
    return outcome;
  }

  const user = outcome.user;

  return {
    access_token: createAccessToken(user),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      preferred_language: user.preferred_language,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
};
