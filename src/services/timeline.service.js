import Timeline from "../models/timeline.model.js";

export const recordTimeline = async (events, session) => {
  if (!events.length) return;
  await Timeline.create(
    events.map((event) => ({
      ...event,
      previousValue: event.previousValue,
      newValue: event.newValue,
    })),
    { session, ordered: true },
  );
};

export const getTimeline = async (entityType, entityId) => {
  const events = await Timeline.find({ entityType, entityId })
    .sort({ createdAt: 1, _id: 1 })
    .populate("actor", "name email role")
    .lean();

  return events.map(
    ({
      _id,
      action,
      entityType: eventEntityType,
      entityId: eventEntityId,
      actor,
      previousValue,
      newValue,
      changes,
      createdAt,
    }) => ({
      _id,
      action,
      entityType: eventEntityType,
      entityId: eventEntityId,
      performedBy: actor,
      ...(previousValue !== undefined ? { previousValue } : {}),
      ...(newValue !== undefined ? { newValue } : {}),
      changes,
      timestamp: createdAt,
    }),
  );
};
