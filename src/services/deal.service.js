import mongoose from "mongoose";
import Deal from "../models/deal.model.js";
import Customer from "../models/customer.model.js";
import Lead from "../models/lead.model.js";
import { getTimeline, recordTimeline } from "./timeline.service.js";
import User from "../models/user.model.js";

const EXECUTIVE_FIELDS = "name email role userStatus";
const DEAL_FIELDS =
  "title amount currency stage probability expectedRevenue expectedCloseDate description lostReason customer lead assignedExecutive createdAt updatedAt";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const populateDeal = (query) =>
  query
    .select(DEAL_FIELDS)
    .populate("customer", "name email company status")
    .populate("lead", "name email company status")
    .populate("assignedExecutive", EXECUTIVE_FIELDS)
    .lean();

const assertDealAccess = async (deal, actor, resource = "deal") => {
  const assignedId = deal.assignedExecutive?._id || deal.assignedExecutive;
  if (actor.role === "ADMIN") return;
  if (
    actor.role === "SALES_EXECUTIVE" &&
    String(assignedId) === String(actor.id)
  ) {
    return;
  }
  if (actor.role === "SALES_MANAGER") {
    const teamMember = await User.exists({
      _id: assignedId,
      role: "SALES_EXECUTIVE",
      manager: actor.id,
    });
    if (teamMember) return;
  }
  throw createError(`You are not authorized to access this ${resource}`, 403);
};

const saveDeal = async (deal, session) => {
  try {
    await deal.save(session ? { session } : undefined);
  } catch (error) {
    if (error.name === "VersionError") {
      throw createError(
        "Deal was updated by another request; reload and retry",
        409,
      );
    }
    throw error;
  }
};

const createDeal = async (data, actor) => {
  const session = await mongoose.startSession();
  let dealId;
  try {
    await session.withTransaction(async () => {
      const customer = await Customer.findById(data.customer).session(session);
      if (!customer) throw createError("Customer not found", 404);
      await assertDealAccess(customer, actor, "customer");
      if (String(customer.originalLead) !== String(data.lead)) {
        throw createError("Deal lead must be the customer's original lead", 409);
      }
      const lead = await Lead.findById(data.lead).session(session);
      if (
        !lead ||
        String(lead.convertedCustomer) !== String(customer._id) ||
        lead.status !== "Converted"
      ) {
        throw createError("Deal lead and customer references are inconsistent", 409);
      }
      if (String(lead.assignedExecutive) !== String(customer.assignedExecutive)) {
        throw createError("Deal lead and customer assignments are inconsistent", 409);
      }

      const [deal] = await Deal.create(
        [{
          ...data,
          assignedExecutive: customer.assignedExecutive,
        }],
        { session, ordered: true },
      );
      await recordTimeline(
        [
          {
            entityType: "Deal",
            entityId: deal._id,
            action: "deal.created",
            actor: actor.id,
            newValue: deal.stage,
            changes: { lead: lead._id, customer: customer._id },
          },
          {
            entityType: "Deal",
            entityId: deal._id,
            action: "deal.assigned",
            actor: actor.id,
            previousValue: null,
            newValue: deal.assignedExecutive,
          },
        ],
        session,
      );
      dealId = deal._id;
    });
  } finally {
    await session.endSession();
  }
  return populateDeal(Deal.findById(dealId));
};

const listDeals = async (
  {
    page,
    limit,
    search,
    stage,
    status,
    minAmount,
    maxAmount,
    customer,
    lead,
    assignedExecutive,
    dateFrom,
    dateTo,
    expectedCloseDateFrom,
    expectedCloseDateTo,
    sortBy,
    sortOrder,
  },
  actor,
) => {
  const filters = [];
  if (actor.role === "SALES_EXECUTIVE") {
    filters.push({ assignedExecutive: actor.id });
  } else if (actor.role === "SALES_MANAGER") {
    const team = await User.find({
      role: "SALES_EXECUTIVE",
      manager: actor.id,
    })
      .select("_id")
      .lean();
    filters.push({ assignedExecutive: { $in: team.map(({ _id }) => _id) } });
  }
  if (assignedExecutive) filters.push({ assignedExecutive });

  const filter = {};
  const andFilters = [...filters];
  if (stage) filter.stage = stage;
  if (status === "Open") andFilters.push({ stage: { $nin: ["Won", "Lost"] } });
  if (status === "Won" || status === "Lost") {
    andFilters.push({ stage: status });
  }
  if (andFilters.length) filter.$and = andFilters;
  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};
    if (minAmount !== undefined) filter.amount.$gte = minAmount;
    if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
  }
  if (customer) filter.customer = customer;
  if (lead) filter.lead = lead;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = dateFrom;
    if (dateTo) filter.createdAt.$lte = dateTo;
  }
  if (expectedCloseDateFrom || expectedCloseDateTo) {
    filter.expectedCloseDate = {};
    if (expectedCloseDateFrom) {
      filter.expectedCloseDate.$gte = expectedCloseDateFrom;
    }
    if (expectedCloseDateTo) {
      filter.expectedCloseDate.$lte = expectedCloseDateTo;
    }
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["title", "description", "lostReason"].map((field) => ({
      [field]: { $regex: escapedSearch, $options: "i" },
    }));
  }

  const [deals, total] = await Promise.all([
    populateDeal(
      Deal.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ),
    Deal.countDocuments(filter),
  ]);
  return {
    deals,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getDealById = async (id, actor) => {
  const deal = await Deal.findById(id);
  if (!deal) return null;
  await assertDealAccess(deal, actor);
  return populateDeal(Deal.findById(id));
};

const getDealTimelineById = async (id, actor) => {
  const deal = await Deal.findById(id);
  if (!deal) return null;
  await assertDealAccess(deal, actor);
  return getTimeline("Deal", id);
};

const updateDeal = async (id, updates, actor) => {
  const deal = await Deal.findById(id);
  if (!deal) return null;
  await assertDealAccess(deal, actor);
  Object.assign(deal, updates);
  if (deal.stage === "Won") deal.probability = 100;
  if (deal.stage === "Lost") deal.probability = 0;
  await saveDeal(deal);
  return populateDeal(Deal.findById(id));
};

const updateDealStage = async (id, { stage, lostReason }, actor) => {
  const session = await mongoose.startSession();
  let dealFound = false;
  try {
    await session.withTransaction(async () => {
      const deal = await Deal.findById(id).session(session);
      if (!deal) return;
      dealFound = true;
      await assertDealAccess(deal, actor);
      if (["Won", "Lost"].includes(deal.stage)) {
        throw createError("Closed deals cannot be moved to another stage", 409);
      }

      const previousStage = deal.stage;
      if (previousStage === stage) return;
      deal.stage = stage;
      if (stage === "Won") {
        deal.probability = 100;
        deal.lostReason = undefined;
      } else if (stage === "Lost") {
        deal.probability = 0;
        deal.lostReason = lostReason;
      } else {
        deal.lostReason = undefined;
      }
      await saveDeal(deal, session);
      const events = [
        {
          entityType: "Deal",
          entityId: deal._id,
          action: "deal.stage_changed",
          actor: actor.id,
          previousValue: previousStage,
          newValue: stage,
        },
      ];
      if (stage === "Won" || stage === "Lost") {
        events.push({
          entityType: "Deal",
          entityId: deal._id,
          action: stage === "Won" ? "deal.won" : "deal.lost",
          actor: actor.id,
          previousValue: previousStage,
          newValue: stage,
          changes: stage === "Lost" ? { lostReason } : {},
        });
      }
      await recordTimeline(events, session);
    });
  } finally {
    await session.endSession();
  }
  return dealFound ? populateDeal(Deal.findById(id)) : null;
};

export default {
  createDeal,
  listDeals,
  getDealById,
  getDealTimelineById,
  updateDeal,
  updateDealStage,
};
