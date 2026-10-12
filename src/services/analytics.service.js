import mongoose from "mongoose";
import Activity from "../models/activity.model.js";
import Customer from "../models/customer.model.js";
import Deal, { dealStages } from "../models/deal.model.js";
import Lead from "../models/lead.model.js";
import User from "../models/user.model.js";

const closedStages = ["Won", "Lost"];

const getScope = async (actor) => {
  if (actor.role === "ADMIN") return null;
  if (actor.role === "SALES_EXECUTIVE") {
    return [new mongoose.Types.ObjectId(actor.id)];
  }

  const executives = await User.find({
    role: "SALES_EXECUTIVE",
    manager: actor.id,
  })
    .select("_id")
    .lean();
  return executives.map(({ _id }) => _id);
};

const assignedFilter = (field, scope) =>
  scope === null ? {} : { [field]: { $in: scope } };

const currencyTotals = (entries, amountField) => {
  const totals = {};
  for (const entry of entries) {
    totals[entry._id] = entry[amountField];
  }
  return totals;
};

const sum = (values) => Object.values(values).reduce((total, value) => total + value, 0);

const aggregateDeals = (filter) =>
  Deal.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$currency",
        totalDeals: { $sum: 1 },
        openDeals: {
          $sum: { $cond: [{ $not: [{ $in: ["$stage", closedStages] }] }, 1, 0] },
        },
        wonDeals: { $sum: { $cond: [{ $eq: ["$stage", "Won"] }, 1, 0] } },
        lostDeals: { $sum: { $cond: [{ $eq: ["$stage", "Lost"] }, 1, 0] } },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ["$stage", "Won"] }, "$amount", 0] },
        },
        expectedRevenue: {
          $sum: {
            $cond: [
              { $not: [{ $in: ["$stage", closedStages] }] },
              "$expectedRevenue",
              0,
            ],
          },
        },
      },
    },
  ]);

const getDashboard = async (actor) => {
  const scope = await getScope(actor);
  const leadFilter = assignedFilter("assignedExecutive", scope);
  const customerFilter = assignedFilter("assignedExecutive", scope);
  const dealFilter = assignedFilter("assignedExecutive", scope);
  const activityFilter = assignedFilter("assignedUser", scope);
  const now = new Date();

  const [
    leadStatsResult,
    totalCustomers,
    dealStats,
    pendingActivities,
    overdueActivities,
  ] = await Promise.all([
    Lead.aggregate([
      { $match: leadFilter },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          newLeads: { $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] } },
          qualifiedLeads: {
            $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] },
          },
          convertedLeads: {
            $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] },
          },
        },
      },
    ]),
    Customer.countDocuments(customerFilter),
    aggregateDeals(dealFilter),
    Activity.countDocuments({
      ...activityFilter,
      status: { $ne: "Completed" },
      dueDate: { $gte: now },
    }),
    Activity.countDocuments({
      ...activityFilter,
      status: { $ne: "Completed" },
      dueDate: { $lt: now },
    }),
  ]);

  const leadStats = leadStatsResult[0] || {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
  };
  const revenueByCurrency = currencyTotals(dealStats, "totalRevenue");
  const expectedRevenueByCurrency = currencyTotals(dealStats, "expectedRevenue");
  const totalDeals = dealStats.reduce((total, row) => total + row.totalDeals, 0);
  const openDeals = dealStats.reduce((total, row) => total + row.openDeals, 0);
  const wonDeals = dealStats.reduce((total, row) => total + row.wonDeals, 0);
  const lostDeals = dealStats.reduce((total, row) => total + row.lostDeals, 0);

  return {
    ...leadStats,
    totalCustomers,
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    totalRevenue: sum(revenueByCurrency),
    revenueByCurrency,
    expectedRevenue: sum(expectedRevenueByCurrency),
    expectedRevenueByCurrency,
    conversionRate:
      leadStats.totalLeads === 0
        ? 0
        : (leadStats.convertedLeads / leadStats.totalLeads) * 100,
    pendingActivities,
    overdueActivities,
  };
};

const getPipeline = async (actor) => {
  const scope = await getScope(actor);
  const groups = await Deal.aggregate([
    { $match: assignedFilter("assignedExecutive", scope) },
    {
      $group: {
        _id: { stage: "$stage", currency: "$currency" },
        dealCount: { $sum: 1 },
        totalValue: { $sum: "$amount" },
      },
    },
  ]);
  const stageStats = new Map();
  for (const { _id, dealCount, totalValue } of groups) {
    const stats = stageStats.get(_id.stage) || {
      stage: _id.stage,
      dealCount: 0,
      totalValue: 0,
      valueByCurrency: {},
    };
    stats.dealCount += dealCount;
    stats.totalValue += totalValue;
    stats.valueByCurrency[_id.currency] = totalValue;
    stageStats.set(_id.stage, stats);
  }
  return dealStages.map(
    (stage) =>
      stageStats.get(stage) || {
        stage,
        dealCount: 0,
        totalValue: 0,
        valueByCurrency: {},
      },
  );
};

const getTeamPerformance = async (actor) => {
  const userFilter = { role: "SALES_EXECUTIVE" };
  if (actor.role === "SALES_MANAGER") userFilter.manager = actor.id;
  const team = await User.find(userFilter)
    .select("_id name email")
    .sort({ name: 1, _id: 1 })
    .lean();
  const executiveIds = team.map(({ _id }) => _id);
  const executiveFilter = { assignedExecutive: { $in: executiveIds } };
  const activityTeamFilter = { assignedUser: { $in: executiveIds } };
  const now = new Date();

  const [leadGroups, customerGroups, dealGroups, dealCurrencyGroups, activityGroups] =
    await Promise.all([
      Lead.aggregate([
        { $match: executiveFilter },
        {
          $group: {
            _id: "$assignedExecutive",
            totalLeads: { $sum: 1 },
            newLeads: { $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] } },
            qualifiedLeads: {
              $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] },
            },
            convertedLeads: {
              $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] },
            },
          },
        },
      ]),
      Customer.aggregate([
        { $match: executiveFilter },
        { $group: { _id: "$assignedExecutive", totalCustomers: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: executiveFilter },
        {
          $group: {
            _id: "$assignedExecutive",
            totalDeals: { $sum: 1 },
            openDeals: {
              $sum: { $cond: [{ $not: [{ $in: ["$stage", closedStages] }] }, 1, 0] },
            },
            wonDeals: { $sum: { $cond: [{ $eq: ["$stage", "Won"] }, 1, 0] } },
            lostDeals: { $sum: { $cond: [{ $eq: ["$stage", "Lost"] }, 1, 0] } },
          },
        },
      ]),
      Deal.aggregate([
        { $match: executiveFilter },
        {
          $group: {
            _id: { executive: "$assignedExecutive", currency: "$currency" },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ["$stage", "Won"] }, "$amount", 0] },
            },
            expectedRevenue: {
              $sum: {
                $cond: [
                  { $not: [{ $in: ["$stage", closedStages] }] },
                  "$expectedRevenue",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Activity.aggregate([
        { $match: activityTeamFilter },
        {
          $group: {
            _id: "$assignedUser",
            pendingActivities: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "Completed"] },
                      { $gte: ["$dueDate", now] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            overdueActivities: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "Completed"] },
                      { $lt: ["$dueDate", now] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

  const toMap = (rows) => new Map(rows.map((row) => [String(row._id), row]));
  const leadsByExecutive = toMap(leadGroups);
  const customersByExecutive = toMap(customerGroups);
  const dealsByExecutive = toMap(dealGroups);
  const activitiesByExecutive = toMap(activityGroups);
  const moneyByExecutive = new Map();
  for (const { _id, totalRevenue, expectedRevenue } of dealCurrencyGroups) {
    const id = String(_id.executive);
    const money = moneyByExecutive.get(id) || {
      revenueByCurrency: {},
      expectedRevenueByCurrency: {},
    };
    money.revenueByCurrency[_id.currency] = totalRevenue;
    money.expectedRevenueByCurrency[_id.currency] = expectedRevenue;
    moneyByExecutive.set(id, money);
  }

  return team.map((executive) => {
    const id = String(executive._id);
    const leads = leadsByExecutive.get(id) || {};
    const deals = dealsByExecutive.get(id) || {};
    const money = moneyByExecutive.get(id) || {
      revenueByCurrency: {},
      expectedRevenueByCurrency: {},
    };
    return {
      executive,
      metrics: {
        totalLeads: leads.totalLeads || 0,
        newLeads: leads.newLeads || 0,
        qualifiedLeads: leads.qualifiedLeads || 0,
        convertedLeads: leads.convertedLeads || 0,
        totalCustomers: customersByExecutive.get(id)?.totalCustomers || 0,
        totalDeals: deals.totalDeals || 0,
        openDeals: deals.openDeals || 0,
        wonDeals: deals.wonDeals || 0,
        lostDeals: deals.lostDeals || 0,
        totalRevenue: sum(money.revenueByCurrency),
        revenueByCurrency: money.revenueByCurrency,
        expectedRevenue: sum(money.expectedRevenueByCurrency),
        expectedRevenueByCurrency: money.expectedRevenueByCurrency,
        conversionRate:
          leads.totalLeads
            ? (leads.convertedLeads / leads.totalLeads) * 100
            : 0,
        pendingActivities:
          activitiesByExecutive.get(id)?.pendingActivities || 0,
        overdueActivities:
          activitiesByExecutive.get(id)?.overdueActivities || 0,
      },
    };
  });
};

export default { getDashboard, getPipeline, getTeamPerformance };
