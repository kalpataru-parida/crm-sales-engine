import { Schema, model } from "mongoose";

const TimelineSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ["Lead", "Customer", "Deal", "User"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    changes: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

TimelineSchema.index({ entityType: 1, entityId: 1, createdAt: 1, _id: 1 });
TimelineSchema.index({ actor: 1, createdAt: -1 });

const Timeline = model("Timeline", TimelineSchema);

export default Timeline;
