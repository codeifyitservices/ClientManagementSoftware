import mongoose from "mongoose";

const commentAttachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
});

const ticketCommentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [commentAttachmentSchema],
  },
  {
    timestamps: true,
  }
);

const ticketTimelineSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
});

const ticketAttachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    raisedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    severity: {
      type: String,
      enum: ["Minor", "Major", "Critical"],
      default: "Minor",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "Assigned", "In Progress", "Resolved", "Closed", "Reopened"],
      default: "Open",
    },
    description: {
      type: String,
      default: "",
    },
    stepsToReproduce: {
      type: String,
      default: "",
    },
    expectedResult: {
      type: String,
      default: "",
    },
    actualResult: {
      type: String,
      default: "",
    },
    attachments: [ticketAttachmentSchema],
    comments: [ticketCommentSchema],
    timeline: [ticketTimelineSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate sequential Ticket ID
ticketSchema.pre("save", async function () {
  if (this.isNew && !this.ticketId) {
    try {
      const lastTicket = await this.constructor.findOne(
        { ticketId: /^BUG-\d{4}$/ },
        {},
        { sort: { ticketId: -1 } }
      );
      let nextNumber = 1;
      if (lastTicket && lastTicket.ticketId) {
        const parts = lastTicket.ticketId.split("-");
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
      this.ticketId = `BUG-${String(nextNumber).padStart(4, "0")}`;
    } catch (err) {
      console.error("Error auto-generating Bug Ticket ID:", err.message);
      this.ticketId = `BUG-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
});

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

export default Ticket;
