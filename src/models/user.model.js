import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["ADMIN", "SALES_MANAGER", "SALES_EXECUTIVE"],
      default: "SALES_EXECUTIVE",
    },
    userStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    refreshTokenHash: { type: String, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

UserSchema.index({ role: 1, userStatus: 1, createdAt: -1 });
UserSchema.index({ name: 1 });

UserSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

UserSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

const User = model("User", UserSchema);

export default User;
