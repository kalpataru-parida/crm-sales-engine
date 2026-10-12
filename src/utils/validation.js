import Joi from "joi";

const bcryptCompatiblePassword = Joi.string()
  .custom((value, helpers) =>
    Buffer.byteLength(value, "utf8") > 72
      ? helpers.error("password.tooLong")
      : value,
  )
  .messages({ "password.tooLong": "Password must be at most 72 UTF-8 bytes" });
const password = bcryptCompatiblePassword.min(6).required();
const objectId = Joi.string().hex().length(24).required();
const phone = Joi.string()
  .pattern(/^\+[1-9]\d{1,14}$/)
  .messages({
    "string.base": "Phone number must be text.",
    "string.pattern.base":
      "Phone number must be in international format (e.g., +12125550199).",
  });

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().lowercase().max(254).required(),
  phone: phone.required(),
  password,
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().max(254).required(),
  password: bcryptCompatiblePassword.min(1).required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().lowercase().max(254).required(),
  phone: phone.required(),
  password,
  role: Joi.string()
    .valid("ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE")
    .required(),
  userStatus: Joi.string().valid("ACTIVE", "INACTIVE").default("ACTIVE"),
  manager: Joi.string().hex().length(24).allow(null),
}).custom((value, helpers) => {
  if (value.manager && value.role !== "SALES_EXECUTIVE") {
    return helpers.error("manager.executiveOnly");
  }
  return value;
}).messages({
  "manager.executiveOnly": '"manager" can only be set for a sales executive',
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  email: Joi.string().trim().email().lowercase().max(254),
  phone,
  password: bcryptCompatiblePassword.min(12),
  role: Joi.string().valid("ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"),
  userStatus: Joi.string().valid("ACTIVE", "INACTIVE"),
  manager: Joi.string().hex().length(24).allow(null),
})
  .min(1)
  .required()
  .custom((value, helpers) => {
    if (
      value.manager &&
      value.role &&
      value.role !== "SALES_EXECUTIVE"
    ) {
      return helpers.error("manager.executiveOnly");
    }
    return value;
  })
  .messages({
    "manager.executiveOnly": '"manager" can only be set for a sales executive',
  });

export const statusSchema = Joi.object({
  userStatus: Joi.string().valid("ACTIVE", "INACTIVE").required(),
});

export const userIdSchema = Joi.object({ id: objectId });

export const userListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  role: Joi.string().valid("ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"),
  userStatus: Joi.string().valid("ACTIVE", "INACTIVE"),
  sortBy: Joi.string()
    .valid("name", "email", "role", "userStatus", "createdAt", "updatedAt")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

const leadSources = [
  "Website",
  "Referral",
  "Social Media",
  "Email",
  "Phone",
  "Other",
];
const leadStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
  "Lost",
];
const leadPriorities = ["Low", "Medium", "High"];
const optionalLeadEmail = Joi.string()
  .trim()
  .email()
  .lowercase()
  .max(254)
  .allow("");
const leadFields = {
  name: Joi.string().trim().min(1).max(100),
  email: optionalLeadEmail,
  phone: phone.allow(""),
  company: Joi.string().trim().max(150).allow(""),
  source: Joi.string().valid(...leadSources),
  priority: Joi.string().valid(...leadPriorities),
  description: Joi.string().trim().max(2000).allow(""),
};

export const createLeadSchema = Joi.object({
  ...leadFields,
  name: leadFields.name.required(),
  source: leadFields.source.default("Other"),
  status: Joi.string()
    .valid(...leadStatuses.filter((status) => status !== "Converted"))
    .default("New"),
  priority: leadFields.priority.default("Medium"),
  assignedExecutive: objectId.optional(),
});

export const updateLeadSchema = Joi.object(leadFields).min(1).required();

export const updateLeadStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...leadStatuses.filter((status) => status !== "Converted"))
    .required(),
});

export const assignLeadSchema = Joi.object({
  assignedExecutive: objectId,
});

export const convertLeadSchema = Joi.object({
  deal: Joi.object({
    title: Joi.string().trim().min(1).max(150).required(),
    amount: Joi.number().greater(0).required(),
    currency: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-Z]{3}$/)
      .default("USD"),
    probability: Joi.number().min(0).max(100).default(0),
    expectedCloseDate: Joi.date().iso().required(),
    description: Joi.string().trim().max(2000).allow(""),
  })
    .required()
    .custom((value, helpers) => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (value.expectedCloseDate < today) {
        return helpers.error("date.past");
      }
      return value;
    })
    .messages({ "date.past": '"expectedCloseDate" cannot be in the past' }),
});

export const leadIdSchema = Joi.object({ id: objectId });

export const leadListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  source: Joi.string().valid(...leadSources),
  status: Joi.string().valid(...leadStatuses),
  priority: Joi.string().valid(...leadPriorities),
  assignedExecutive: Joi.string().hex().length(24),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  sortBy: Joi.string()
    .valid(
      "name",
      "company",
      "source",
      "status",
      "priority",
      "createdAt",
      "updatedAt",
    )
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})
  .custom((value, helpers) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      return helpers.error("date.range");
    }
    return value;
  })
  .messages({ "date.range": '"dateFrom" must be before or equal to "dateTo"' });

const customerStatus = ["Active", "Inactive"];
const dealStages = [
  "Qualification",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];
const dealStatuses = ["Open", "Won", "Lost"];
const dealFields = {
  title: Joi.string().trim().min(1).max(150),
  amount: Joi.number().greater(0),
  currency: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{3}$/),
  probability: Joi.number().min(0).max(100),
  expectedCloseDate: Joi.date().iso(),
  description: Joi.string().trim().max(2000).allow(""),
};

export const createDealSchema = Joi.object({
  ...dealFields,
  title: dealFields.title.required(),
  amount: dealFields.amount.required(),
  expectedCloseDate: dealFields.expectedCloseDate.required(),
  currency: dealFields.currency.default("USD"),
  probability: dealFields.probability.default(0),
  customer: objectId,
  lead: objectId,
})
  .custom((value, helpers) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (value.expectedCloseDate < today) {
      return helpers.error("date.past");
    }
    return value;
  })
  .messages({ "date.past": '"expectedCloseDate" cannot be in the past' });

export const updateDealSchema = Joi.object(dealFields)
  .min(1)
  .required()
  .custom((value, helpers) => {
    if (
      value.expectedCloseDate &&
      value.expectedCloseDate < new Date(new Date().setUTCHours(0, 0, 0, 0))
    ) {
      return helpers.error("date.past");
    }
    return value;
  })
  .messages({ "date.past": '"expectedCloseDate" cannot be in the past' });

export const updateDealStageSchema = Joi.object({
  stage: Joi.string()
    .valid(...dealStages)
    .required(),
  lostReason: Joi.string().trim().min(1).max(1000),
}).custom((value, helpers) => {
  if (value.stage === "Lost" && !value.lostReason) {
    return helpers.error("deal.lostReason");
  }
  return value;
}).messages({
  "deal.lostReason": '"lostReason" is required when a deal is Lost',
});

export const dealIdSchema = Joi.object({ id: objectId });

export const dealListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  stage: Joi.string().valid(...dealStages),
  customer: Joi.string().hex().length(24),
  lead: Joi.string().hex().length(24),
  assignedExecutive: Joi.string().hex().length(24),
  status: Joi.string().valid(...dealStatuses),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(0),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  expectedCloseDateFrom: Joi.date().iso(),
  expectedCloseDateTo: Joi.date().iso(),
  sortBy: Joi.string()
    .valid("title", "amount", "probability", "expectedCloseDate", "stage", "createdAt", "updatedAt")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})
  .custom((value, helpers) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      return helpers.error("date.range");
    }
    if (
      value.expectedCloseDateFrom &&
      value.expectedCloseDateTo &&
      value.expectedCloseDateFrom > value.expectedCloseDateTo
    ) {
      return helpers.error("closeDate.range");
    }
    if (
      value.minAmount !== undefined &&
      value.maxAmount !== undefined &&
      value.minAmount > value.maxAmount
    ) {
      return helpers.error("amount.range");
    }
    return value;
  })
  .messages({
    "date.range": '"dateFrom" must be before or equal to "dateTo"',
    "closeDate.range":
      '"expectedCloseDateFrom" must be before or equal to "expectedCloseDateTo"',
    "amount.range": '"minAmount" must be less than or equal to "maxAmount"',
  });

const customerFields = {
  name: Joi.string().trim().min(1).max(100),
  email: optionalLeadEmail,
  phone: phone.allow(""),
  company: Joi.string().trim().max(150).allow(""),
  address: Joi.string().trim().max(500).allow(""),
  status: Joi.string().valid(...customerStatus),
};

export const createCustomerSchema = Joi.object({
  ...customerFields,
  name: customerFields.name.required(),
  originalLead: objectId,
  assignedExecutive: objectId.optional(),
  status: customerFields.status.default("Active"),
});

export const updateCustomerSchema = Joi.object({
  ...customerFields,
  assignedExecutive: objectId.optional(),
})
  .min(1)
  .required();

export const customerIdSchema = Joi.object({ id: objectId });

export const customerListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid(...customerStatus),
  assignedExecutive: Joi.string().hex().length(24),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  sortBy: Joi.string()
    .valid("name", "company", "status", "createdAt", "updatedAt")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})
  .custom((value, helpers) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      return helpers.error("date.range");
    }
    return value;
  })
  .messages({ "date.range": '"dateFrom" must be before or equal to "dateTo"' });

const activityTypes = [
  "Call",
  "Email",
  "Meeting",
  "Demo",
  "Follow-up",
  "Reminder",
  "Note",
];
const activityRelatedEntityTypes = ["Lead", "Customer", "Deal", "User"];
const relatedEntitySchema = Joi.object({
  type: Joi.string().valid(...activityRelatedEntityTypes).required(),
  id: objectId,
});
const activityFields = {
  type: Joi.string().valid(...activityTypes),
  title: Joi.string().trim().min(1).max(150),
  description: Joi.string().trim().max(2000).allow(""),
  assignedUser: objectId.optional(),
  dueDate: Joi.date().iso(),
  relatedEntity: relatedEntitySchema.allow(null),
};

export const createActivitySchema = Joi.object({
  ...activityFields,
  type: activityFields.type.required(),
  title: activityFields.title.required(),
  dueDate: activityFields.dueDate.required(),
});

export const updateActivitySchema = Joi.object(activityFields)
  .min(1)
  .required();

export const activityIdSchema = Joi.object({ id: objectId });

export const activityListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  type: Joi.string().valid(...activityTypes),
  status: Joi.string().valid("Pending", "Completed", "Overdue"),
  assignedUser: Joi.string().hex().length(24),
  relatedEntityType: Joi.string().valid(...activityRelatedEntityTypes),
  relatedEntityId: Joi.string().hex().length(24),
  sortBy: Joi.string()
    .valid("title", "type", "dueDate", "status", "createdAt", "updatedAt")
    .default("dueDate"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});
