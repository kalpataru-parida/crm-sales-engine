import mongoose from "mongoose";
import Activity from "../models/activity.model.js";
import Customer from "../models/customer.model.js";
import Deal from "../models/deal.model.js";
import Lead from "../models/lead.model.js";
import User from "../models/user.model.js";
import { recordTimeline } from "./timeline.service.js";

const userFields = "name email role userStatus";
const relatedModels = { Lead, Customer, Deal, User };

export const getActivityStatus = ({ status, dueDate }, now = new Date()) =>
  status !== "Completed" && dueDate < now
    ? "Overdue"
    : status === "Completed"
      ? "Completed"
      : "Pending";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getAssignedUsersForActor = async (actor) => {
  if (actor.role === "ADMIN") return null;
  if (actor.role === "SALES_EXECUTIVE") return [actor.id];
  const team = await User.find({
    role: "SALES_EXECUTIVE",
    manager: actor.id,
  })
    .select("_id")
    .lean();
  return [actor.id, ...team.map(({ _id }) => String(_id))];
};

const checkUserAccess = async (userId, actor, { requireActive = false } = {}) => {
  const filter = { _id: userId };
  if (requireActive) filter.userStatus = "ACTIVE";
  if (actor.role === "SALES_EXECUTIVE" && String(userId) !== String(actor.id)) {
    throw createError("You are not authorized to assign this activity", 403);
  }
  if (actor.role === "SALES_MANAGER" && String(userId) !== String(actor.id)) {
    filter.role = "SALES_EXECUTIVE";
    filter.manager = actor.id;
  }
  const user = await User.findOne(filter).select("_id").lean();
  if (!user) {
    if (requireActive) throw createError("Assigned user must be active", 400);
    throw createError("User not found or is not accessible", 404);
  }
};

const checkRelatedEntityAccess = async (relatedEntity, actor) => {
  if (!relatedEntity) return;
  const Model = relatedModels[relatedEntity.type];
  const entity = await Model.findById(relatedEntity.id).lean();
  if (!entity) throw createError("Related entity not found", 404);
  if (relatedEntity.type === "User") {
    await checkUserAccess(entity._id, actor);
    return;
  }

  const assignedUser = entity.assignedExecutive;
  if (!assignedUser) throw createError("Related entity has no assigned user", 409);
  await checkUserAccess(assignedUser, actor);
};

const activityFilter = async (actor) => {
  const assignedUsers = await getAssignedUsersForActor(actor);
  return assignedUsers === null ? {} : { assignedUser: { $in: assignedUsers } };
};

const populateActivity = (query) =>
  query
    .populate("assignedUser", userFields)
    .populate("createdBy", userFields)
    .populate("relatedEntity.id");

const presentActivity = (activity) => {
  if (!activity) return null;
  const result = { ...activity };
  result.status = getActivityStatus(result);
  return result;
};

const presentActivities = (activities) => activities.map(presentActivity);

const createActivity = async (data, actor) => {
  const assignedUser = data.assignedUser || actor.id;
  await checkUserAccess(assignedUser, actor, { requireActive: true });
  await checkRelatedEntityAccess(data.relatedEntity, actor);
  const session = await mongoose.startSession();
  let activityId;
  try {
    await session.withTransaction(async () => {
      const [activity] = await Activity.create(
        [{
          ...data,
          assignedUser,
          createdBy: actor.id,
        }],
        { session, ordered: true },
      );
      if (
        data.relatedEntity &&
        data.relatedEntity.type !== "User" &&
        ["Note", "Follow-up"].includes(data.type)
      ) {
        await recordTimeline(
          [
            {
              entityType: data.relatedEntity.type,
              entityId: data.relatedEntity.id,
              action: data.type === "Note" ? "note.added" : "follow_up.created",
              actor: actor.id,
              newValue: {
                activityId: activity._id,
                title: activity.title,
                description: activity.description,
                dueDate: activity.dueDate,
              },
            },
          ],
          session,
        );
      }
      activityId = activity._id;
    });
  } finally {
    await session.endSession();
  }
  return presentActivity(
    await populateActivity(Activity.findById(activityId)).lean(),
  );
};

const listActivities = async (
  {
    page,
    limit,
    search,
    type,
    status,
    assignedUser,
    relatedEntityType,
    relatedEntityId,
    sortBy,
    sortOrder,
  },
  actor,
) => {
  const filter = await activityFilter(actor);
  if (assignedUser) {
    if (filter.assignedUser) {
      filter.assignedUser.$in = filter.assignedUser.$in.filter(
        (id) => String(id) === String(assignedUser),
      );
      if (!filter.assignedUser.$in.length) {
        return {
          activities: [],
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
      filter.assignedUser = { $in: [assignedUser] };
    } else {
      filter.assignedUser = assignedUser;
    }
  }
  if (type) filter.type = type;
  if (relatedEntityType) filter["relatedEntity.type"] = relatedEntityType;
  if (relatedEntityId) filter["relatedEntity.id"] = relatedEntityId;
  const now = new Date();
  if (status === "Completed") {
    filter.status = "Completed";
  } else if (status === "Pending") {
    filter.status = { $ne: "Completed" };
    filter.dueDate = { $gte: now };
  } else if (status === "Overdue") {
    filter.status = { $ne: "Completed" };
    filter.dueDate = { $lt: now };
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["title", "description"].map((field) => ({
      [field]: { $regex: escapedSearch, $options: "i" },
    }));
  }

  const [activities, total] = await Promise.all([
    populateActivity(
      Activity.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ).lean(),
    Activity.countDocuments(filter),
  ]);
  return {
    activities: presentActivities(activities),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getActivityById = async (id, actor) => {
  const activity = await Activity.findById(id);
  if (!activity) return null;
  const filter = await activityFilter(actor);
  if (
    filter.assignedUser &&
    !filter.assignedUser.$in.some(
      (assignedId) => String(assignedId) === String(activity.assignedUser),
    )
  ) {
    throw createError("You are not authorized to access this activity", 403);
  }
  return presentActivity(
    await populateActivity(Activity.findById(id)).lean(),
  );
};

const updateActivity = async (id, updates, actor) => {
  const activity = await Activity.findById(id);
  if (!activity) return null;
  await assertActivityAccess(activity, actor);
  if (updates.assignedUser) {
    await checkUserAccess(updates.assignedUser, actor, { requireActive: true });
  }
  if (updates.relatedEntity) {
    await checkRelatedEntityAccess(updates.relatedEntity, actor);
  }
  Object.assign(activity, updates);
  await activity.save();
  return presentActivity(
    await populateActivity(Activity.findById(id)).lean(),
  );
};

const assertActivityAccess = async (activity, actor) => {
  const filter = await activityFilter(actor);
  if (
    filter.assignedUser &&
    !filter.assignedUser.$in.some(
      (assignedId) => String(assignedId) === String(activity.assignedUser),
    )
  ) {
    throw createError("You are not authorized to access this activity", 403);
  }
};

const completeActivity = async (id, actor) => {
  const session = await mongoose.startSession();
  let activityFound = false;
  try {
    await session.withTransaction(async () => {
      const activity = await Activity.findById(id).session(session);
      if (!activity) return;
      activityFound = true;
      await assertActivityAccess(activity, actor);
      const wasCompleted = activity.status === "Completed";
      const previousStatus = getActivityStatus(activity);
      activity.status = "Completed";
      activity.completedAt ||= new Date();
      await activity.save({ session });
      if (
        !wasCompleted &&
        activity.type === "Follow-up" &&
        activity.relatedEntity &&
        activity.relatedEntity.type !== "User"
      ) {
        await recordTimeline(
          [
            {
              entityType: activity.relatedEntity.type,
              entityId: activity.relatedEntity.id,
              action: "follow_up.completed",
              actor: actor.id,
              previousValue: previousStatus,
              newValue: "Completed",
              changes: { activityId: activity._id },
            },
          ],
          session,
        );
      }
    });
  } finally {
    await session.endSession();
  }
  if (!activityFound) return null;
  return presentActivity(
    await populateActivity(Activity.findById(id)).lean(),
  );
};

const deleteActivity = async (id, actor) => {
  const activity = await Activity.findById(id);
  if (!activity) return null;
  await assertActivityAccess(activity, actor);
  if (actor.role !== "ADMIN" && String(activity.createdBy) !== String(actor.id)) {
    throw createError("Only the activity creator or an administrator can delete it", 403);
  }
  await activity.deleteOne();
  return true;
};

export default {
  createActivity,
  listActivities,
  getActivityById,
  updateActivity,
  completeActivity,
  deleteActivity,
};
