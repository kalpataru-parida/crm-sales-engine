import activityService from "../services/activity.service.js";
import { createApiError } from "../utils/api-error.js";

const createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity(req.body, req.user);
    res.status(201).send({ message: "Activity created successfully", activity });
  } catch (error) {
    next(error);
  }
};

const listActivities = async (req, res, next) => {
  try {
    res.send(await activityService.listActivities(req.validatedQuery, req.user));
  } catch (error) {
    next(error);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const activity = await activityService.getActivityById(req.params.id, req.user);
    if (!activity) return next(createApiError(404, "Activity not found"));
    res.send({ activity });
  } catch (error) {
    next(error);
  }
};

const updateActivity = async (req, res, next) => {
  try {
    const activity = await activityService.updateActivity(
      req.params.id,
      req.body,
      req.user,
    );
    if (!activity) return next(createApiError(404, "Activity not found"));
    res.send({ message: "Activity updated successfully", activity });
  } catch (error) {
    next(error);
  }
};

const completeActivity = async (req, res, next) => {
  try {
    const activity = await activityService.completeActivity(req.params.id, req.user);
    if (!activity) return next(createApiError(404, "Activity not found"));
    res.send({ message: "Activity marked as completed", activity });
  } catch (error) {
    next(error);
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    const deleted = await activityService.deleteActivity(req.params.id, req.user);
    if (!deleted) return next(createApiError(404, "Activity not found"));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default {
  createActivity,
  listActivities,
  getActivity,
  updateActivity,
  completeActivity,
  deleteActivity,
};
