import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Deal from "../models/deal.model.js";
import Lead from "../models/lead.model.js";
import Timeline from "../models/timeline.model.js";
import User from "../models/user.model.js";
import { getTimeline, recordTimeline } from "./timeline.service.js";

const CUSTOMER_FIELDS =
  "name email phone company address status originalLead assignedExecutive createdAt updatedAt";
const LEAD_FIELDS =
  "name email phone company source status assignedExecutive convertedCustomer convertedDeal";
const EXECUTIVE_FIELDS = "name email role userStatus";
const DEAL_FIELDS =
  "title amount currency stage probability expectedRevenue expectedCloseDate description lostReason customer lead assignedExecutive createdAt updatedAt";

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

const assertAccess = async (customer, actor, session) => {
  const assignedId =
    customer.assignedExecutive?._id || customer.assignedExecutive;
  if (actor.role === "ADMIN") return;
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
  throw createError("You are not authorized to access this customer", 403);
};

const populateCustomer = (query) =>
  query
    .select(CUSTOMER_FIELDS)
    .populate("originalLead", LEAD_FIELDS)
    .populate("assignedExecutive", EXECUTIVE_FIELDS)
    .populate("deals", DEAL_FIELDS);

const getPopulatedCustomer = (id) =>
  populateCustomer(Customer.findById(id)).lean();

const createCustomer = async (customerData, actor) => {
  const session = await mongoose.startSession();
  let customerId;
  try {
    await session.withTransaction(async () => {
      const lead = await Lead.findById(customerData.originalLead).session(
        session,
      );
      if (!lead) throw createError("Original lead not found", 404);

      const leadAssignedId = String(lead.assignedExecutive);
      if (
        customerData.assignedExecutive &&
        String(customerData.assignedExecutive) !== leadAssignedId
      ) {
        throw createError(
          "Customer must be assigned to the executive who owns the original lead",
          409,
        );
      }
      const leadView = { ...lead.toObject() };
      await assertAccess(leadView, actor, session);
      if (
        lead.status !== "Qualified" ||
        lead.convertedCustomer ||
        lead.convertedDeal
      ) {
        throw createError(
          "Only qualified, unconverted leads can become customers",
          409,
        );
      }

      const [customer] = await Customer.create(
        [
          {
            ...customerData,
            assignedExecutive: lead.assignedExecutive,
          },
        ],
        { session, ordered: true },
      );
      lead.status = "Converted";
      lead.convertedCustomer = customer._id;
      await lead.save({ session });
      await recordTimeline(
        [
          {
            entityType: "Lead",
            entityId: lead._id,
            action: "lead.converted",
            actor: actor.id,
            previousValue: "Qualified",
            newValue: "Converted",
            changes: { customer: customer._id },
          },
          {
            entityType: "Customer",
            entityId: customer._id,
            action: "customer.created",
            actor: actor.id,
            newValue: customer._id,
            changes: { lead: lead._id },
          },
        ],
        session,
      );
      customerId = customer._id;
    });
  } finally {
    await session.endSession();
  }
  return getPopulatedCustomer(customerId);
};

const listCustomers = async (
  {
    page,
    limit,
    search,
    status,
    assignedExecutive,
    dateFrom,
    dateTo,
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
  if (filters.length) filter.$and = filters;
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = dateFrom;
    if (dateTo) filter.createdAt.$lte = dateTo;
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "email", "phone", "company", "address"].map(
      (field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }),
    );
  }

  const [customers, total] = await Promise.all([
    populateCustomer(
      Customer.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ).lean(),
    Customer.countDocuments(filter),
  ]);

  return {
    customers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getCustomerById = async (id, actor) => {
  const customer = await Customer.findById(id);
  if (!customer) return null;
  await assertAccess(customer, actor);
  return getPopulatedCustomer(id);
};

const getCustomerTimelineById = async (id, actor) => {
  const customer = await Customer.findById(id);
  if (!customer) return null;
  await assertAccess(customer, actor);
  return getTimeline("Customer", id);
};

const updateCustomer = async (id, updates, actor) => {
  const session = await mongoose.startSession();
  let customerFound = false;
  try {
    await session.withTransaction(async () => {
      const customer = await Customer.findById(id).session(session);
      if (!customer) return;
      customerFound = true;
      await assertAccess(customer, actor, session);

      if (updates.assignedExecutive) {
        if (
          actor.role === "SALES_EXECUTIVE" &&
          String(updates.assignedExecutive) !== String(actor.id)
        ) {
          throw createError(
            "Sales executives can only assign customers to themselves",
            403,
          );
        }
        const assignedExecutive = await getActiveExecutive(
          updates.assignedExecutive,
          actor,
          session,
        );
        const previousExecutive = customer.assignedExecutive;
        updates.assignedExecutive = assignedExecutive;
        if (String(previousExecutive) !== String(assignedExecutive)) {
          const lead = await Lead.findById(customer.originalLead).session(
            session,
          );
          if (!lead || String(lead.convertedCustomer) !== String(customer._id)) {
            throw createError(
              "Customer is not consistently linked to its original lead",
              409,
            );
          }
          lead.assignedExecutive = assignedExecutive;
          await lead.save({ session });
          const deals = await Deal.find({ customer: customer._id })
            .select("_id")
            .session(session)
            .lean();
          await Deal.updateMany(
            { customer: customer._id },
            { $set: { assignedExecutive } },
            { session, runValidators: true },
          );
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
              {
                entityType: "Customer",
                entityId: customer._id,
                action: "customer.assigned",
                actor: actor.id,
                previousValue: previousExecutive,
                newValue: assignedExecutive,
              },
              ...deals.map((deal) => ({
                entityType: "Deal",
                entityId: deal._id,
                action: "deal.assigned",
                actor: actor.id,
                previousValue: previousExecutive,
                newValue: assignedExecutive,
              })),
            ],
            session,
          );
        }
      }

      Object.assign(customer, updates);
      await customer.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return customerFound ? getPopulatedCustomer(id) : null;
};

const deleteCustomer = async (id, actor) => {
  const session = await mongoose.startSession();
  let customerFound = false;
  try {
    await session.withTransaction(async () => {
      const customer = await Customer.findById(id).session(session);
      if (!customer) return;
      customerFound = true;
      await assertAccess(customer, actor, session);

      if (await Deal.exists({ customer: customer._id }).session(session)) {
        throw createError(
          "Customers with associated deals cannot be deleted",
          409,
        );
      }
      const lead = await Lead.findById(customer.originalLead).session(session);
      if (!lead || String(lead.convertedCustomer) !== String(customer._id)) {
        throw createError(
          "Customer is not consistently linked to its original lead",
          409,
        );
      }
      if (lead.convertedDeal) {
        throw createError(
          "Customers with associated deals cannot be deleted",
          409,
        );
      }

      lead.status = "Qualified";
      lead.convertedCustomer = undefined;
      await lead.save({ session });
      await customer.deleteOne({ session });
      await Timeline.create(
        [
          {
            entityType: "Customer",
            entityId: customer._id,
            action: "customer.deleted",
            actor: actor.id,
            changes: { lead: lead._id },
          },
        ],
        { session, ordered: true },
      );
    });
  } finally {
    await session.endSession();
  }
  return customerFound;
};

export default {
  createCustomer,
  listCustomers,
  getCustomerById,
  getCustomerTimelineById,
  updateCustomer,
  deleteCustomer,
};
