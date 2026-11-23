const bcrypt = require("bcrypt");
const authRepository = require("./auth.repository");

async function registerUser(data) {
  const requestedRoleName = data.role || "customer";

  const customerRole = await authRepository.findRoleByName("customer");

  const requestedRole =
    await authRepository.findRoleByName(requestedRoleName);

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

module.exports = { registerUser };