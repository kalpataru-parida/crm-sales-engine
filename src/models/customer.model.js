import { Schema, model } from "mongoose";

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    company: { type: String, trim: true, maxlength: 150 },
    address: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    originalLead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      unique: true,
    },
    assignedExecutive: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

CustomerSchema.index({ assignedExecutive: 1, createdAt: -1 });
// Cretaed a virtua field to populate delas
CustomerSchema.virtual("deals", {
  ref: "Deal",
  localField: "_id",
  foreignField: "customer",
});

const Customer = model("Customer", CustomerSchema);

export default Customer;
