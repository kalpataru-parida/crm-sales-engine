import { Schema, model } from "mongoose";

const activityTypes = [
  "Call",
  "Email",
  "Meeting",
  "Demo",
  "Follow-up",
  "Reminder",
  "Note",
];
const relatedEntityTypes = ["Lead", "Customer", "Deal", "User"];
const activityStatuses = ["Pending", "Completed", "Overdue"];

const RelatedEntitySchema = new Schema(
  {
    type: { type: String, enum: relatedEntityTypes, required: true },
    id: {
      type: Schema.Types.ObjectId,
      refPath: "relatedEntity.type",
      required: true,
    },
  },
  { _id: false },
);

const ActivitySchema = new Schema(
  {
    type: { type: String, enum: activityTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    assignedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: activityStatuses,
      default: "Pending",
      required: true,
    },
    relatedEntity: { type: RelatedEntitySchema },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

ActivitySchema.pre("validate", function validateCompletionDate() {
  if (this.status === "Completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.status !== "Completed") this.completedAt = undefined;
});

ActivitySchema.index({ assignedUser: 1, dueDate: 1, status: 1 });
ActivitySchema.index({ createdBy: 1, createdAt: -1 });
ActivitySchema.index({ "relatedEntity.type": 1, "relatedEntity.id": 1 });

export { activityTypes, activityStatuses, relatedEntityTypes };

const Activity = model("Activity", ActivitySchema);

export default Activity;
