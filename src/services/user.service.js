import User from "../models/user.model.js";
import Lead from "../models/lead.model.js";
import Timeline from "../models/timeline.model.js";
import Activity from "../models/activity.model.js";

const SAFE_USER_FIELDS =
  "name email phone role userStatus manager createdAt updatedAt";

const validateManager = async (role, managerId) => {
  if (managerId == null) return;
  if (role !== "SALES_EXECUTIVE") {
    const error = new Error("Only sales executives can be assigned to a manager");
    error.statusCode = 400;
    throw error;
  }

  const manager = await User.exists({
    _id: managerId,
    role: "SALES_MANAGER",
    userStatus: "ACTIVE",
  });
  if (!manager) {
    const error = new Error("Manager must be an active sales manager");
    error.statusCode = 400;
    throw error;
  }
};

const createUser = async (userData) => {
  await validateManager(userData.role, userData.manager);
  const user = await User.create(userData);
  return User.findById(user._id).select(SAFE_USER_FIELDS).lean();
};

const listUsers = async ({
  page,
  limit,
  search,
  role,
  userStatus,
  sortBy,
  sortOrder,
}) => {
  const filter = {};
  if (role) filter.role = role;
  if (userStatus) filter.userStatus = userStatus;
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(SAFE_USER_FIELDS)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (id) =>
  User.findById(id).select(SAFE_USER_FIELDS).lean();

const updateUser = async (id, updates, actorId) => {
  const user = await User.findById(id).select("+tokenVersion +refreshTokenHash");
  if (!user) return null;

  if (
    user._id.equals(actorId) &&
    ((updates.role && updates.role !== user.role) ||
      updates.userStatus === "INACTIVE")
  ) {
    const error = new Error("You cannot change your own role or deactivate yourself");
    error.statusCode = 400;
    throw error;
  }

  const nextRole = updates.role || user.role;
  const nextManager =
    updates.manager === undefined
      ? nextRole === "SALES_EXECUTIVE"
        ? user.manager
        : null
      : updates.manager;
  await validateManager(nextRole, nextManager);
  if (updates.role && updates.role !== user.role) {
    if (
      user.role === "SALES_EXECUTIVE" &&
      (await Lead.exists({ assignedExecutive: user._id }))
    ) {
      const error = new Error(
        "Reassign this executive's leads before changing their role",
      );
      error.statusCode = 409;
      throw error;
    }
    if (
      user.role === "SALES_MANAGER" &&
      (await User.exists({ manager: user._id }))
    ) {
      const error = new Error(
        "Reassign this manager's sales executives before changing their role",
      );
      error.statusCode = 409;
      throw error;
    }
  }
  if (nextRole !== "SALES_EXECUTIVE") updates.manager = null;

  const credentialsChanged =
    (updates.password && updates.password !== user.password) ||
    (updates.role && updates.role !== user.role) ||
    (updates.userStatus && updates.userStatus !== user.userStatus);
  Object.assign(user, updates);
  if (credentialsChanged) {
    user.tokenVersion += 1;
    user.refreshTokenHash = undefined;
  }
  await user.save();
  return getUserById(user._id);
};

const setUserStatus = async (id, userStatus, actorId) =>
  updateUser(id, { userStatus }, actorId);

const deleteUser = async (id, actorId) => {
  if (id === actorId) {
    const error = new Error("You cannot delete your own account");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(id);
  if (!user) return null;
  if (user.userStatus !== "INACTIVE") {
    const error = new Error("Only inactive users can be deleted");
    error.statusCode = 409;
    throw error;
  }
  const hasAssignedLeads = await Lead.exists({
    assignedExecutive: user._id,
  });
  const appearsInTimeline = await Timeline.exists({
    $or: [
      { actor: user._id },
      { "changes.previousExecutive": user._id },
      { "changes.assignedExecutive": user._id },
    ],
  });
  const appearsInActivity = await Activity.exists({
    $or: [
      { assignedUser: user._id },
      { createdBy: user._id },
      { "relatedEntity.type": "User", "relatedEntity.id": user._id },
    ],
  });
  if (hasAssignedLeads || appearsInTimeline || appearsInActivity) {
    const error = new Error(
      "Users referenced by leads, lead assignment history, or activities cannot be deleted",
    );
    error.statusCode = 409;
    throw error;
  }
  if (await User.exists({ manager: user._id })) {
    const error = new Error(
      "Reassign this manager's sales executives before deleting the user",
    );
    error.statusCode = 409;
    throw error;
  }
  await user.deleteOne();
  return true;
};

export default {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  setUserStatus,
  deleteUser,
};
