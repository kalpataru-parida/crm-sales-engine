import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Deal from "../models/deal.model.js";
import Lead from "../models/lead.model.js";
import Timeline from "../models/timeline.model.js";
import User from "../models/user.model.js";
import { getTimeline, recordTimeline } from "./timeline.service.js";

const ASSIGNED_EXECUTIVE_FIELDS = "name email role userStatus";
const LEAD_FIELDS =
  "name email phone company source status priority assignedExecutive convertedCustomer convertedDeal description createdAt updatedAt";
const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
  "Lost",
];

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getActiveExecutive = async (id, actor, session) => {
  const filter = {
    _id: id,
    role: "SALES_EXECUTIVE",
    userStatus: "ACTIVE",
  };
  if (actor.role === "SALES_MANAGER") filter.manager = actor.id;
  let query = User.findOne(filter).select("_id");
  if (session) query = query.session(session);
  const user = await query.lean();
  if (!user) {
    if (actor.role === "SALES_MANAGER") {
      throw createError(
        "Sales managers can only assign active executives on their team",
        403,
      );
    }
    throw createError("Assigned user must be an active sales executive", 400);
  }
  return user._id;
};

const canAccessAllLeads = (role) => role === "ADMIN";

const assertLeadAccess = async (lead, actor, session) => {
  const assignedId = lead.assignedExecutive?._id || lead.assignedExecutive;
  if (canAccessAllLeads(actor.role)) return;
  if (
    actor.role === "SALES_EXECUTIVE" &&
    String(assignedId) === String(actor.id)
  ) {
    return;
  }
  if (actor.role === "SALES_MANAGER") {
    let teamQuery = User.findOne({
      _id: assignedId,
      role: "SALES_EXECUTIVE",
      manager: actor.id,
    }).select("_id");
    if (session) teamQuery = teamQuery.session(session);
    if (await teamQuery.lean()) return;
  }
  throw createError("You are not authorized to access this lead", 403);
};

const populatedLead = (query) => {
  query
    .select(LEAD_FIELDS)
    .populate("assignedExecutive", ASSIGNED_EXECUTIVE_FIELDS);
  return query.lean();
};

const getLeadTimeline = async (leadId) => {
  const events = await Timeline.find({ entityType: "Lead", entityId: leadId })
    .sort({ createdAt: 1, _id: 1 })
    .populate("actor", "name role")
    .lean();
  const executiveIds = [
    ...new Set(
      events.flatMap(({ changes }) =>
        [changes?.previousExecutive, changes?.assignedExecutive]
          .filter(Boolean)
          .map(String),
      ),
    ),
  ];
  const executives = await User.find({ _id: { $in: executiveIds } })
    .select("name email")
    .lean();
  const executiveById = new Map(
    executives.map((executive) => [String(executive._id), executive]),
  );

  return events.map(
    ({
      action,
      actor,
      changes,
      createdAt,
      _id,
      entityType,
      entityId,
      previousValue,
      newValue,
    }) => ({
      _id,
      entityType,
      entityId,
      performedBy: actor,
      previousValue,
      newValue,
      timestamp: createdAt,
      type:
        action === "lead.assigned"
          ? "ASSIGNED"
          : action === "lead.reassigned"
            ? "REASSIGNED"
            : action === "lead.converted"
              ? "CONVERTED"
              : action,
      action,
      changedBy: actor,
      previousExecutive: changes?.previousExecutive
        ? executiveById.get(String(changes.previousExecutive)) || null
        : null,
      assignedExecutive: changes?.assignedExecutive
        ? executiveById.get(String(changes.assignedExecutive)) || null
        : null,
      customer: changes?.customer,
      deal: changes?.deal,
      changedAt: createdAt,
    }),
  );
};

const getLeadWithTimeline = async (leadId) => {
  const lead = await populatedLead(Lead.findById(leadId));
  if (!lead) return null;
  const activityTimeline = await getLeadTimeline(leadId);
  return { ...lead, activityTimeline };
};

const createLead = async (leadData, actor) => {
  if (
    actor.role === "SALES_EXECUTIVE" &&
    leadData.assignedExecutive &&
    String(leadData.assignedExecutive) !== String(actor.id)
  ) {
    throw createError(
      "Sales executives can only assign leads to themselves",
      403,
    );
  }
  const assignedExecutiveId =
    leadData.assignedExecutive ||
    (actor.role === "SALES_EXECUTIVE" ? actor.id : undefined);
  if (!assignedExecutiveId) {
    throw createError("An assigned sales executive is required", 400);
  }

  const session = await mongoose.startSession();
  let leadId;
  try {
    await session.withTransaction(async () => {
      const assignedExecutive = await getActiveExecutive(
        assignedExecutiveId,
        actor,
        session,
      );
      const [lead] = await Lead.create([{ ...leadData, assignedExecutive }], {
        session,
        ordered: true,
      });
      await recordTimeline(
        [
          {
            entityType: "Lead",
            entityId: lead._id,
            action: "lead.created",
            actor: actor.id,
          },
          {
            entityType: "Lead",
            entityId: lead._id,
            action: "lead.assigned",
            actor: actor.id,
            previousValue: null,
            newValue: assignedExecutive,
            changes: {
              previousExecutive: null,
              assignedExecutive,
            },
          },
        ],
        session,
      );
      leadId = lead._id;
    });
  } finally {
    await session.endSession();
  }
  return getLeadWithTimeline(leadId);
};

const convertLead = async (id, { deal: dealData }, actor, session) => {
  const lead = await Lead.findById(id).session(session);
  if (!lead) return null;
  await assertLeadAccess(lead, actor, session);
  if (
    lead.status !== "Qualified" ||
    lead.convertedCustomer ||
    lead.convertedDeal
  ) {
    throw createError(
      "Only qualified, unconverted leads can be converted",
      409,
    );
  }

  const [customer] = await Customer.create(
    [
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        originalLead: lead._id,
        assignedExecutive: lead.assignedExecutive,
      },
    ],
    { session, ordered: true },
  );
  const [deal] = await Deal.create(
    [
      {
        ...dealData,
        customer: customer._id,
        lead: lead._id,
        assignedExecutive: lead.assignedExecutive,
      },
    ],
    { session, ordered: true },
  );

  const convertedLead = await Lead.findOneAndUpdate(
    {
      _id: lead._id,
      status: "Qualified",
      convertedCustomer: null,
      convertedDeal: null,
    },
    {
      $set: {
        status: "Converted",
        convertedCustomer: customer._id,
        convertedDeal: deal._id,
      },
    },
    { new: true, runValidators: true, session },
  );
  if (!convertedLead) {
    throw createError("Lead is no longer eligible for conversion", 409);
  }

  await recordTimeline(
    [
      {
        entityType: "Lead",
        entityId: lead._id,
        action: "lead.converted",
        actor: actor.id,
        previousValue: "Qualified",
        newValue: "Converted",
        changes: { customer: customer._id, deal: deal._id },
      },
      {
        entityType: "Customer",
        entityId: customer._id,
        action: "customer.created",
        actor: actor.id,
        newValue: customer._id,
        changes: { lead: lead._id },
      },
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

  return { lead: convertedLead, customer, deal };
};

const listLeads = async (
  {
    page,
    limit,
    search,
    source,
    status,
    priority,
    assignedExecutive,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  },
  actor,
) => {
  const filter = {};
  const assignmentFilters = [];
  if (actor.role === "SALES_EXECUTIVE") {
    assignmentFilters.push({ assignedExecutive: actor.id });
  } else if (actor.role === "SALES_MANAGER") {
    const team = await User.find({
      role: "SALES_EXECUTIVE",
      manager: actor.id,
    })
      .select("_id")
      .lean();
    assignmentFilters.push({
      assignedExecutive: { $in: team.map(({ _id }) => _id) },
    });
  }
  if (assignedExecutive) assignmentFilters.push({ assignedExecutive });
  if (assignmentFilters.length) filter.$and = assignmentFilters;
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = dateFrom;
    if (dateTo) filter.createdAt.$lte = dateTo;
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "email", "phone", "company", "description"].map(
      (field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }),
    );
  }

  const [leads, total] = await Promise.all([
    populatedLead(
      Lead.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getLeadById = async (id, actor) => {
  const lead = await Lead.findById(id);
  if (!lead) return null;
  await assertLeadAccess(lead, actor);
  return getLeadWithTimeline(id);
};

const getLeadTimelineById = async (id, actor) => {
  const lead = await Lead.findById(id);
  if (!lead) return null;
  await assertLeadAccess(lead, actor);
  return getTimeline("Lead", id);
};

const updateLead = async (id, updates, actor) => {
  const session = await mongoose.startSession();
  let leadFound = false;
  try {
    await session.withTransaction(async () => {
      const lead = await Lead.findById(id).session(session);
      if (!lead) return;
      leadFound = true;
      await assertLeadAccess(lead, actor, session);
      if (lead.status === "Converted" && updates.status) {
        throw createError("Converted lead status cannot be changed", 409);
      }
      const previousStatus = lead.status;
      const previousPriority = lead.priority;
      Object.assign(lead, updates);
      await lead.save({ session });

      const events = [];
      if (previousStatus !== lead.status) {
        events.push({
          entityType: "Lead",
          entityId: lead._id,
          action: "lead.status_changed",
          actor: actor.id,
          previousValue: previousStatus,
          newValue: lead.status,
        });
      }
      if (previousPriority !== lead.priority) {
        events.push({
          entityType: "Lead",
          entityId: lead._id,
          action: "lead.priority_changed",
          actor: actor.id,
          previousValue: previousPriority,
          newValue: lead.priority,
        });
      }
      await recordTimeline(events, session);
    });
  } finally {
    await session.endSession();
  }
  return leadFound ? getLeadWithTimeline(id) : null;
};

const updateLeadStatus = async (id, status, actor) => {
  if (status === "Converted") {
    throw createError(
      "Use the lead conversion endpoint to convert a lead",
      409,
    );
  }
  return updateLead(id, { status }, actor);
};

const assignLead = async (id, assignedExecutiveId, actor) => {
  if (!["ADMIN", "SALES_MANAGER"].includes(actor.role)) {
    throw createError("You are not authorized to assign leads", 403);
  }

  const session = await mongoose.startSession();
  let leadFound = false;
  try {
    await session.withTransaction(async () => {
      const lead = await Lead.findById(id).session(session);
      if (!lead) return;
      leadFound = true;
      await assertLeadAccess(lead, actor);

      const assignedExecutive = await getActiveExecutive(
        assignedExecutiveId,
        actor,
        session,
      );
      if (String(lead.assignedExecutive) === String(assignedExecutive)) return;

      const previousExecutive = lead.assignedExecutive;
      lead.assignedExecutive = assignedExecutive;
      await lead.save({ session });
      if (lead.convertedCustomer) {
        const customerUpdate = await Customer.updateOne(
          { _id: lead.convertedCustomer, originalLead: lead._id },
          { $set: { assignedExecutive } },
          { session, runValidators: true },
        );
        if (customerUpdate.matchedCount !== 1) {
          throw createError(
            "Converted lead's customer relationship is inconsistent",
            409,
          );
        }
        await Deal.updateMany(
          { customer: lead.convertedCustomer },
          { $set: { assignedExecutive } },
          { session, runValidators: true },
        );
      }
      await recordTimeline(
        [
          {
            entityType: "Lead",
            entityId: lead._id,
            action: "lead.reassigned",
            actor: actor.id,
            previousValue: previousExecutive,
            newValue: assignedExecutive,
            changes: { previousExecutive, assignedExecutive },
          },
          ...(lead.convertedCustomer
            ? [
                {
                  entityType: "Customer",
                  entityId: lead.convertedCustomer,
                  action: "customer.assigned",
                  actor: actor.id,
                  previousValue: previousExecutive,
                  newValue: assignedExecutive,
                },
                ...(
                  await Deal.find({ customer: lead.convertedCustomer })
                    .select("_id assignedExecutive")
                    .session(session)
                    .lean()
                ).map((deal) => ({
                  entityType: "Deal",
                  entityId: deal._id,
                  action: "deal.assigned",
                  actor: actor.id,
                  previousValue: previousExecutive,
                  newValue: assignedExecutive,
                })),
              ]
            : []),
        ],
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  return leadFound ? getLeadWithTimeline(id) : null;
};

const deleteLead = async (id, actor) => {
  const lead = await Lead.findById(id);
  if (!lead) return null;
  await assertLeadAccess(lead, actor);
  if (lead.status === "Converted") {
    throw createError("Converted leads cannot be deleted", 409);
  }
  await lead.deleteOne();
  return true;
};

export default {
  createLead,
  convertLead,
  listLeads,
  getLeadById,
  getLeadTimelineById,
  updateLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
};
