const repository = require("./users.repository");

function publicError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function reviewStaff(actorId, userId, decision) {
  return repository.transaction(async (client) => {
    const reviewer = await repository.lockReviewer(client, actorId);

    if (!reviewer || reviewer.status !== "active" || !reviewer.can_review) {
      throw publicError(403, "You cannot review staff accounts.");
    }

    if (actorId === userId) {
      throw publicError(409, "You cannot review your own account.");
    }

    const staff = await repository.lockStaffRequest(client, userId);

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
        "This account does not have a pending staff request.",
      );
    }

    const approved = decision === "approve";

    const newRoleId = approved ? staff.requested_role_id : staff.role_id;

    const newRole = approved ? staff.requested_role : staff.role;

    const newStatus = approved ? "active" : "rejected";

    const user = await repository.updateStaffDecision(
      client,
      userId,
      newRoleId,
      newStatus,
    );

    await repository.recordStaffDecision(client, actorId, userId, decision, {
      previous_status: staff.status,
      requested_role: staff.requested_role,
      new_status: newStatus,
      new_role: newRole,
    });

    return {
      ...user,
      role: newRole,
    };
  });
}

async function changeUserStatus(actorId, userId, status) {
  if (!["active", "inactive"].includes(status)) {
    throw publicError(400, "Status must be active or inactive.");
  }

  if (actorId === userId) {
    throw publicError(403, "You cannot change your own account status.");
  }

  return repository.transaction(async (client) => {
    const actor = await repository.lockStatusActor(client, actorId);

    if (!actor || actor.status !== "active" || !actor.can_change_status) {
      throw publicError(403, "You cannot change account statuses.");
    }

    // Reuse the existing function that locks and reads a user.
    const target = await repository.lockStaffRequest(client, userId);

    if (!target) {
      throw publicError(404, "User not found.");
    }

    if (
      !["active", "inactive"].includes(target.status) ||
      target.requested_role_id !== null
    ) {
      throw publicError(
        409,
        "Only approved active or inactive accounts can use this endpoint. Staff requests require the staff-review workflow.",
      );
    }

    if (target.status === status) {
      throw publicError(409, "The account already has that status.");
    }

    if (status === "inactive" && target.role === "owner") {
      const ownerCount = await repository.countActiveOwners(client);

      if (ownerCount <= 1) {
        throw publicError(409, "The last active Owner cannot be deactivated.");
      }
    }

    const user = await repository.updateUserStatus(client, userId, status);

    await repository.recordUserStatusChange(client, actorId, userId, {
      previous_status: target.status,
      new_status: status,
      role: target.role,
    });

    return user;
  });
}

module.exports = {
  listUsers: repository.listUsers,
  reviewStaff,
  updateMyProfile: repository.updateOwnProfile,
  changeUserStatus,
};

async function changeUserRole(actorId, userId, role) {
  const allowedRoles = [
    "customer",
    "mechanic",
    "store_manager",
    "owner",
    "administrator",
  ];

  if (!allowedRoles.includes(role)) {
    throw publicError(400, "Invalid role.");
  }

  if (actorId === userId) {
    throw publicError(403, "You cannot change your own role.");
  }

  return repository.transaction(async (client) => {
    const actor = await repository.lockRoleActor(client, actorId);

    if (!actor || actor.status !== "active" || !actor.can_change_role) {
      throw publicError(
        403,
        "You do not have permission to perform this action.",
      );
    }

    const target = await repository.lockStaffRequest(client, userId);

    if (!target) {
      throw publicError(404, "User not found.");
    }

    if (
      !["active", "inactive"].includes(target.status) ||
      target.requested_role_id !== null
    ) {
      throw publicError(
        409,
        "Resolve the staff registration before changing this role.",
      );
    }

    if (target.role === role) {
      throw publicError(409, "This user already has that role.");
    }

    if (target.role === "owner" && target.status === "active") {
      const ownerCount = await repository.countActiveOwners(client);

      if (ownerCount <= 1) {
        throw publicError(409, "The last active Owner cannot be demoted.");
      }
    }

    const newRole = await repository.findAssignableRole(client, role);

    if (!newRole) {
      throw publicError(409, "This role is missing from the database.");
    }

    const user = await repository.updateUserRole(client, userId, newRole.id);

    await repository.recordUserRoleChange(client, actorId, userId, {
      previous_role: target.role,
      new_role: role,
      status: target.status,
    });

    return user;
  });
}

module.exports.changeUserRole = changeUserRole;
