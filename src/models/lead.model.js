import { Schema, model } from "mongoose";

const LeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    company: { type: String, trim: true, maxlength: 150 },
    source: {
      type: String,
      enum: ["Website", "Referral", "Social Media", "Email", "Phone", "Other"],
      default: "Other",
    },
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Qualified",
        "Unqualified",
        "Converted",
        "Lost",
      ],
      default: "New",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    assignedExecutive: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    convertedCustomer: { type: Schema.Types.ObjectId, ref: "Customer" },
    convertedDeal: { type: Schema.Types.ObjectId, ref: "Deal" },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

LeadSchema.index({ assignedExecutive: 1, createdAt: -1 });
LeadSchema.index({ status: 1, source: 1, priority: 1, createdAt: -1 });

const Lead = model("Lead", LeadSchema);

export default Lead;
