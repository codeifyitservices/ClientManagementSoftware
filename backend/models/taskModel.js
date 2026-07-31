import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

const timelineSchema = new mongoose.Schema({
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

const attachmentSchema = new mongoose.Schema({
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

const taskSchema = new mongoose.Schema(
  {
    taskId: {
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
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    assignedBy: {
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
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "On Hold", "Completed"],
      default: "Pending",
    },
    description: {
      type: String,
      default: "",
    },
    attachments: [attachmentSchema],
    comments: [commentSchema],
    timeline: [timelineSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate sequential Task ID
taskSchema.pre("save", async function () {
  if (this.isNew && !this.taskId) {
    try {
      const lastTask = await this.constructor.findOne(
        { taskId: /^TSK-\d{4}$/ },
        {},
        { sort: { taskId: -1 } }
      );
      let nextNumber = 1;
      if (lastTask && lastTask.taskId) {
        const parts = lastTask.taskId.split("-");
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
      this.taskId = `TSK-${String(nextNumber).padStart(4, "0")}`;
    } catch (err) {
      console.error("Error auto-generating Task ID:", err.message);
      this.taskId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
});

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task;
