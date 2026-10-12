export const schemas = {
  RegisterRequest: {
    type: "object",
    required: ["name", "email", "phone", "password"],
    properties: {
      name: { type: "string", example: "John Doe" },
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      phone: { type: "string", example: "+1234567890" },
      password: {
        type: "string",
        format: "password",
        example: "SecurePassword123",
      },
    },
  },
  CreateUserRequest: {
    type: "object",
    required: ["name", "email", "phone", "password", "role"],
    properties: {
      name: { type: "string", example: "John Doe" },
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      phone: { type: "string", example: "+1234567890" },
      password: {
        type: "string",
        format: "password",
        example: "SecurePassword123",
      },
      role: {
        type: "string",
        enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
        example: "SALES_EXECUTIVE",
      },
      userStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
        example: "ACTIVE",
      },
      manager: {
        type: "string",
        example: "665f1a12b2f0410012345678",
        description: "Active sales manager to whom this sales executive reports.",
      },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      password: {
        type: "string",
        format: "password",
        example: "SecurePassword123",
      },
    },
  },
  RefreshRequest: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string" },
    },
  },
  UpdateUserRequest: {
    type: "object",
    properties: {
      name: { type: "string", example: "John Doe" },
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      phone: { type: "string", example: "+1234567890" },
      password: {
        type: "string",
        format: "password",
        example: "SecurePassword123",
      },
      role: {
        type: "string",
        enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
      },
      userStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
      },
      manager: {
        type: "string",
        nullable: true,
        example: "665f1a12b2f0410012345678",
        description: "Active sales manager; only applicable to sales executives.",
      },
    },
  },
  UpdateUserStatusRequest: {
    type: "object",
    required: ["userStatus"],
    properties: {
      userStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
        example: "INACTIVE",
      },
    },
  },
  CreateLeadRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      source: {
        type: "string",
        enum: ["Website", "Referral", "Social Media", "Email", "Phone", "Other"],
        default: "Other",
      },
      status: {
        type: "string",
        enum: ["New", "Contacted", "Qualified", "Unqualified", "Lost"],
        default: "New",
      },
      priority: { type: "string", enum: ["Low", "Medium", "High"], default: "Medium" },
      assignedExecutive: {
        type: "string",
        example: "665f1a12b2f0410012345678",
        description: "Required for administrators and sales managers. Managers may choose only their own active reports; sales executives default to themselves.",
      },
      description: { type: "string", example: "Interested in the enterprise plan." },
    },
  },
  UpdateLeadRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      source: {
        type: "string",
        enum: ["Website", "Referral", "Social Media", "Email", "Phone", "Other"],
      },
      priority: { type: "string", enum: ["Low", "Medium", "High"] },
      description: { type: "string" },
    },
  },
  UpdateLeadStatusRequest: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["New", "Contacted", "Qualified", "Unqualified", "Lost"],
      },
    },
  },
  AssignLeadRequest: {
    type: "object",
    required: ["assignedExecutive"],
    properties: {
      assignedExecutive: {
        type: "string",
        example: "665f1a12b2f0410012345678",
      },
    },
  },
  ConvertLeadRequest: {
    type: "object",
    required: ["deal"],
    properties: {
      deal: {
        type: "object",
        required: ["title", "amount", "expectedCloseDate"],
        properties: {
          title: { type: "string", example: "Acme enterprise subscription" },
          amount: { type: "number", exclusiveMinimum: 0, example: 25000 },
          currency: { type: "string", pattern: "^[A-Z]{3}$", default: "USD" },
          probability: { type: "number", minimum: 0, maximum: 100, default: 0 },
          expectedCloseDate: { type: "string", format: "date-time" },
          description: { type: "string" },
        },
      },
    },
  },
  Customer: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665f1a12b2f0410012345678" },
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      address: { type: "string", example: "123 Market Street, San Francisco, CA" },
      status: { type: "string", enum: ["Active", "Inactive"], default: "Active" },
      originalLead: { $ref: "#/components/schemas/Lead" },
      assignedExecutive: { $ref: "#/components/schemas/User" },
      deals: {
        type: "array",
        items: { $ref: "#/components/schemas/Deal" },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateCustomerRequest: {
    type: "object",
    required: ["name", "originalLead"],
    properties: {
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      address: { type: "string", example: "123 Market Street, San Francisco, CA" },
      originalLead: { type: "string", example: "665f1a12b2f0410012345678" },
      assignedExecutive: {
        type: "string",
        example: "665f1a12b2f0410012345678",
        description: "Must match the executive assigned to the original lead.",
      },
      status: { type: "string", enum: ["Active", "Inactive"], default: "Active" },
    },
  },
  UpdateCustomerRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      address: { type: "string", example: "123 Market Street, San Francisco, CA" },
      status: { type: "string", enum: ["Active", "Inactive"] },
      assignedExecutive: { type: "string", example: "665f1a12b2f0410012345678" },
    },
  },
  CustomerListResponse: {
    type: "object",
    required: ["customers", "pagination"],
    properties: {
      customers: {
        type: "array",
        items: { $ref: "#/components/schemas/Customer" },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 85 },
          pages: { type: "integer", example: 5 },
        },
      },
    },
  },
  Deal: {
    type: "object",
    required: [
      "title",
      "amount",
      "stage",
      "probability",
      "expectedRevenue",
      "expectedCloseDate",
      "customer",
      "lead",
      "assignedExecutive",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: { type: "string", example: "665f1a12b2f0410012345678" },
      title: { type: "string", example: "Acme enterprise subscription" },
      amount: { type: "number", exclusiveMinimum: 0, example: 25000 },
      currency: { type: "string", example: "USD" },
      stage: {
        type: "string",
        enum: ["Qualification", "Discovery", "Proposal", "Negotiation", "Won", "Lost"],
      },
      probability: { type: "number", minimum: 0, maximum: 100, example: 30 },
      expectedRevenue: {
        type: "number",
        minimum: 0,
        readOnly: true,
        description: "Calculated by the server as amount multiplied by probability divided by 100.",
      },
      expectedCloseDate: { type: "string", format: "date-time" },
      description: { type: "string" },
      lostReason: { type: "string", nullable: true },
      customer: { type: "string", example: "665f1a12b2f0410012345678" },
      lead: { type: "string", example: "665f1a12b2f0410012345678" },
      assignedExecutive: { type: "string", example: "665f1a12b2f0410012345678" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateDealRequest: {
    type: "object",
    required: ["title", "amount", "expectedCloseDate", "customer", "lead"],
    properties: {
      title: { type: "string", example: "Acme enterprise subscription" },
      amount: { type: "number", exclusiveMinimum: 0, example: 25000 },
      currency: { type: "string", pattern: "^[A-Z]{3}$", default: "USD" },
      probability: { type: "number", minimum: 0, maximum: 100, default: 0 },
      expectedCloseDate: { type: "string", format: "date-time" },
      description: { type: "string" },
      customer: { type: "string", example: "665f1a12b2f0410012345678" },
      lead: { type: "string", example: "665f1a12b2f0410012345678" },
    },
  },
  UpdateDealRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      title: { type: "string", example: "Acme enterprise subscription" },
      amount: { type: "number", exclusiveMinimum: 0, example: 25000 },
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
      probability: { type: "number", minimum: 0, maximum: 100 },
      expectedCloseDate: { type: "string", format: "date-time" },
      description: { type: "string" },
    },
  },
  UpdateDealStageRequest: {
    type: "object",
    required: ["stage"],
    properties: {
      stage: {
        type: "string",
        enum: ["Qualification", "Discovery", "Proposal", "Negotiation", "Won", "Lost"],
      },
      lostReason: { type: "string", maxLength: 1000 },
    },
  },
  DealListResponse: {
    type: "object",
    required: ["deals", "pagination"],
    properties: {
      deals: {
        type: "array",
        items: { $ref: "#/components/schemas/Deal" },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 85 },
          pages: { type: "integer", example: 5 },
        },
      },
    },
  },
  LeadConversionResponse: {
    type: "object",
    required: ["message", "lead", "customer", "deal"],
    properties: {
      message: { type: "string", example: "Lead converted successfully" },
      lead: { $ref: "#/components/schemas/Lead" },
      customer: { $ref: "#/components/schemas/Customer" },
      deal: { $ref: "#/components/schemas/Deal" },
    },
  },
  Lead: {
    type: "object",
    properties: {
      _id: { type: "string", example: "665f1a12b2f0410012345678" },
      name: { type: "string", example: "Jordan Lee" },
      email: { type: "string", format: "email", example: "jordan@example.com" },
      phone: { type: "string", example: "+1234567890" },
      company: { type: "string", example: "Acme Inc." },
      source: {
        type: "string",
        enum: ["Website", "Referral", "Social Media", "Email", "Phone", "Other"],
      },
      status: {
        type: "string",
        enum: ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Lost"],
      },
      priority: { type: "string", enum: ["Low", "Medium", "High"] },
      assignedExecutive: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["SALES_EXECUTIVE"] },
          userStatus: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
        },
      },
      convertedCustomer: { type: "string", nullable: true },
      convertedDeal: { type: "string", nullable: true },
      activityTimeline: {
        type: "array",
        description: "Lead events from the Timeline collection, in chronological order.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["ASSIGNED", "REASSIGNED", "CONVERTED"],
            },
            action: { type: "string", example: "lead.converted" },
            changedBy: {
              type: "object",
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                role: {
                  type: "string",
                  enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
                },
              },
            },
            previousExecutive: {
              type: "object",
              nullable: true,
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
              },
            },
            assignedExecutive: {
              type: "object",
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
              },
            },
            customer: { type: "string", nullable: true },
            deal: { type: "string", nullable: true },
            changedAt: { type: "string", format: "date-time" },
          },
        },
      },
      description: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  LeadListResponse: {
    type: "object",
    required: ["leads", "pagination"],
    properties: {
      leads: {
        type: "array",
        items: { $ref: "#/components/schemas/Lead" },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 85 },
          pages: { type: "integer", example: 5 },
        },
      },
    },
  },
  User: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "665f1a12b2f0410012345678",
      },
      name: { type: "string", example: "John Doe" },
      email: {
        type: "string",
        format: "email",
        example: "john@example.com",
      },
      phone: { type: "string", example: "+1234567890" },
      role: {
        type: "string",
        enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
      },
      userStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
      },
      manager: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  RegisterResponse: {
    type: "object",
    required: ["message", "user"],
    properties: {
      message: { type: "string", example: "Registration successful" },
      user: { $ref: "#/components/schemas/User" },
    },
  },
  UserMutationResponse: {
    type: "object",
    required: ["message", "user"],
    properties: {
      message: { type: "string", example: "User created successfully" },
      user: { $ref: "#/components/schemas/User" },
    },
  },
  TokenPair: {
    type: "object",
    required: ["accessToken", "refreshToken"],
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
    },
  },
  TokenResponse: {
    type: "object",
    required: ["accessToken", "refreshToken", "user"],
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      user: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1a12b2f0410012345678" },
          name: { type: "string", example: "John Doe" },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          phone: { type: "string", example: "+1234567890" },
          role: {
            type: "string",
            enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
          },
          userStatus: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE"],
          },
        },
      },
    },
  },
  ProfileResponse: {
    type: "object",
    required: ["user"],
    properties: {
      user: { $ref: "#/components/schemas/User" },
    },
  },
  UserListResponse: {
    type: "object",
    required: ["users", "pagination"],
    properties: {
      users: {
        type: "array",
        items: { $ref: "#/components/schemas/User" },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 85 },
          pages: { type: "integer", example: 5 },
        },
      },
    },
  },
  Activity: {
    type: "object",
    required: [
      "_id",
      "type",
      "title",
      "assignedUser",
      "dueDate",
      "status",
      "createdBy",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: { type: "string", example: "665f1a12b2f0410012345678" },
      type: {
        type: "string",
        enum: ["Call", "Email", "Meeting", "Demo", "Follow-up", "Reminder", "Note"],
      },
      title: { type: "string", example: "Follow up on proposal" },
      description: { type: "string" },
      assignedUser: { $ref: "#/components/schemas/User" },
      dueDate: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["Pending", "Completed", "Overdue"] },
      relatedEntity: {
        type: "object",
        nullable: true,
        required: ["type", "id"],
        properties: {
          type: { type: "string", enum: ["Lead", "Customer", "Deal", "User"] },
          id: {
            oneOf: [
              { $ref: "#/components/schemas/Lead" },
              { $ref: "#/components/schemas/Customer" },
              { $ref: "#/components/schemas/Deal" },
              { $ref: "#/components/schemas/User" },
            ],
          },
        },
      },
      createdBy: { $ref: "#/components/schemas/User" },
      completedAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  CreateActivityRequest: {
    type: "object",
    required: ["type", "title", "dueDate"],
    properties: {
      type: {
        type: "string",
        enum: ["Call", "Email", "Meeting", "Demo", "Follow-up", "Reminder", "Note"],
      },
      title: { type: "string", example: "Follow up on proposal" },
      description: { type: "string" },
      assignedUser: {
        type: "string",
        example: "665f1a12b2f0410012345678",
        description: "Optional; defaults to the current user.",
      },
      dueDate: { type: "string", format: "date-time" },
      relatedEntity: {
        type: "object",
        required: ["type", "id"],
        properties: {
          type: { type: "string", enum: ["Lead", "Customer", "Deal", "User"] },
          id: { type: "string", example: "665f1a12b2f0410012345678" },
        },
      },
    },
  },
  UpdateActivityRequest: {
    type: "object",
    minProperties: 1,
    properties: {
      type: {
        type: "string",
        enum: ["Call", "Email", "Meeting", "Demo", "Follow-up", "Reminder", "Note"],
      },
      title: { type: "string" },
      description: { type: "string" },
      assignedUser: { type: "string", example: "665f1a12b2f0410012345678" },
      dueDate: { type: "string", format: "date-time" },
      relatedEntity: {
        type: "object",
        nullable: true,
        required: ["type", "id"],
        properties: {
          type: { type: "string", enum: ["Lead", "Customer", "Deal", "User"] },
          id: { type: "string", example: "665f1a12b2f0410012345678" },
        },
      },
    },
  },
  ActivityListResponse: {
    type: "object",
    required: ["activities", "pagination"],
    properties: {
      activities: {
        type: "array",
        items: { $ref: "#/components/schemas/Activity" },
      },
      pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 85 },
          pages: { type: "integer", example: 5 },
        },
      },
    },
  },
  TimelineEvent: {
    type: "object",
    required: [
      "action",
      "entityType",
      "entityId",
      "performedBy",
      "timestamp",
    ],
    properties: {
      action: { type: "string", example: "lead.status_changed" },
      entityType: { type: "string", enum: ["Lead", "Customer", "Deal"] },
      entityId: { type: "string", example: "665f1a12b2f0410012345678" },
      performedBy: { $ref: "#/components/schemas/User" },
      previousValue: {},
      newValue: {},
      changes: { type: "object", additionalProperties: true },
      timestamp: { type: "string", format: "date-time" },
    },
  },
  TimelineResponse: {
    type: "object",
    required: ["timeline"],
    properties: {
      timeline: {
        type: "array",
        items: { $ref: "#/components/schemas/TimelineEvent" },
      },
    },
  },
  ErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "details"],
        properties: {
          code: { type: "string", example: "UNAUTHORIZED" },
          message: { type: "string", example: "Invalid or expired token" },
          details: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "email must be valid" },
              },
            },
          },
        },
      },
    },
  },
  ValidationErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "details"],
        properties: {
          code: { type: "string", example: "INVALID_REQUEST" },
          message: { type: "string", example: "Invalid request" },
          details: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "email must be valid" },
              },
            },
          },
        },
      },
    },
  },
};
