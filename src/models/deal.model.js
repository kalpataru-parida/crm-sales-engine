import { Schema, model } from "mongoose";

const dealStages = [
  "Qualification",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

const DealSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (amount) => amount > 0,
        message: "Deal amount must be greater than zero",
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{3}$/,
      default: "USD",
    },
    stage: {
      type: String,
      enum: dealStages,
      default: "Qualification",
    },
    probability: { type: Number, required: true, min: 0, max: 100, default: 0 },
    expectedRevenue: { type: Number, required: true, min: 0, default: 0 },
    expectedCloseDate: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          if (["Won", "Lost"].includes(this.stage)) return true;
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          return date >= today;
        },
        message: "Expected close date cannot be in the past",
      },
    },
    description: { type: String, trim: true, maxlength: 2000 },
    lostReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      required() {
        return this.stage === "Lost";
      },
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    assignedExecutive: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

DealSchema.pre("validate", function calculateExpectedRevenue() {
  this.expectedRevenue =
    Math.round(this.amount * this.probability + Number.EPSILON) / 100;
});

DealSchema.index({ customer: 1, createdAt: -1 });
DealSchema.index({ lead: 1 }, { unique: true });
DealSchema.index({ assignedExecutive: 1, stage: 1, expectedCloseDate: 1 });

export { dealStages };

const Deal = model("Deal", DealSchema);

export default Deal;
