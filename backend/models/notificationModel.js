import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null, // null represents broadcast / Admin notifications
    },
    recipientRole: {
      type: String,
      enum: ["Admin", "Employee", "All"],
      default: "Employee",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Task", "Bug", "Subscription"],
      default: "General",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
