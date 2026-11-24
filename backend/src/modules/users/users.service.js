const repository = require("./users.repository");

function publicError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function reviewStaff(actorId, userId, decision) {
  return repository.transaction(async (client) => {
    const reviewer = await repository.lockReviewer(
      client,
      actorId
    );

    if (
      !reviewer ||
      reviewer.status !== "active" ||
      !reviewer.can_review
    ) {
      throw publicError(403, "You cannot review staff accounts.");
    }

    if (actorId === userId) {
      throw publicError(409, "You cannot review your own account.");
    }

    const staff = await repository.lockStaffRequest(
      client,
      userId
    );

    if (!staff) {
      throw publicError(404, "User not found.");
    }

    if (
      staff.status !== "pending" ||
      staff.role !== "customer" ||
      !["mechanic", "store_manager"].includes(staff.requested_role)
    ) {
      throw publicError(
        409,
        "This account does not have a pending staff request."
      );
    }

    const approved = decision === "approve";

    const newRoleId = approved
      ? staff.requested_role_id
      : staff.role_id;

    const newRole = approved
      ? staff.requested_role
      : staff.role;

    const newStatus = approved ? "active" : "rejected";

    const user = await repository.updateStaffDecision(
      client,
      userId,
      newRoleId,
      newStatus
    );

    await repository.recordStaffDecision(
      client,
      actorId,
      userId,
      decision,
      {
        previous_status: staff.status,
        requested_role: staff.requested_role,
        new_status: newStatus,
        new_role: newRole,
      }
    );

    return {
      ...user,
      role: newRole,
    };
  });
}

module.exports = {
  listUsers: repository.listUsers,
  reviewStaff,
  updateMyProfile: repository.updateOwnProfile,
};