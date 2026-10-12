import dealService from "../services/deal.service.js";
import { createApiError } from "../utils/api-error.js";

const createDeal = async (req, res, next) => {
  try {
    const deal = await dealService.createDeal(req.body, req.user);
    res.status(201).send({ message: "Deal created successfully", deal });
  } catch (error) {
    next(error);
  }
};

const listDeals = async (req, res, next) => {
  try {
    res.send(await dealService.listDeals(req.validatedQuery, req.user));
  } catch (error) {
    next(error);
  }
};

const getDeal = async (req, res, next) => {
  try {
    const deal = await dealService.getDealById(req.params.id, req.user);
    if (!deal) return next(createApiError(404, "Deal not found"));
    res.send({ deal });
  } catch (error) {
    next(error);
  }
};

const getDealTimeline = async (req, res, next) => {
  try {
    const timeline = await dealService.getDealTimelineById(
      req.params.id,
      req.user,
    );
    if (!timeline) return next(createApiError(404, "Deal not found"));
    res.send({ timeline });
  } catch (error) {
    next(error);
  }
};

const updateDeal = async (req, res, next) => {
  try {
    const deal = await dealService.updateDeal(
      req.params.id,
      req.body,
      req.user,
    );
    if (!deal) return next(createApiError(404, "Deal not found"));
    res.send({ message: "Deal updated successfully", deal });
  } catch (error) {
    next(error);
  }
};

const updateDealStage = async (req, res, next) => {
  try {
    const deal = await dealService.updateDealStage(
      req.params.id,
      req.body,
      req.user,
    );
    if (!deal) return next(createApiError(404, "Deal not found"));
    res.send({ message: "Deal stage updated successfully", deal });
  } catch (error) {
    next(error);
  }
};

export default {
  createDeal,
  listDeals,
  getDeal,
  getDealTimeline,
  updateDeal,
  updateDealStage,
};
