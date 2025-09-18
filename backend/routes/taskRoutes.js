// const express = require("express");
// const Task = require("../models/Task");
// const Activity = require("../models/Activity");

// const router = express.Router();

// // ✅ Get all tasks (with optional listId filter)
// router.get("/", async (req, res) => {
//   try {
//     const { listId } = req.query;
//     const filter = listId ? { listId } : {};
//     const tasks = await Task.find(filter).sort({ createdAt: -1 });
//     res.json(tasks);
//   } catch (err) {
//     console.error("Error getting tasks:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Create a task
// router.post("/", async (req, res) => {
//   try {
//     const taskData = {
//       ...req.body,
//       createdBy: req.user.uid,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const newTask = new Task(taskData);
//     await newTask.save();

//     // Create activity
//     const activity = new Activity({
//       listId: newTask.listId,
//       userId: req.user.uid,
//       action: `created task "${newTask.title}"`,
//       taskId: newTask._id,
//     });
//     await activity.save();

//     res.status(201).json(newTask);
//   } catch (err) {
//     console.error("Error creating task:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

// // ✅ Get task by ID
// router.get("/:id", async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);
//     if (!task) return res.status(404).json({ error: "Task not found" });
//     res.json(task);
//   } catch (err) {
//     console.error("Error getting task:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Update task
// router.put("/:id", async (req, res) => {
//   try {
//     const taskData = {
//       ...req.body,
//       updatedAt: new Date(),
//     };

//     const oldTask = await Task.findById(req.params.id);
//     if (!oldTask) {
//       return res.status(404).json({ error: "Task not found" });
//     }

//     const updatedTask = await Task.findByIdAndUpdate(req.params.id, taskData, {
//       new: true,
//     });

//     // Create activity for status changes
//     if (oldTask.status !== updatedTask.status) {
//       const activity = new Activity({
//         listId: updatedTask.listId,
//         userId: req.user.uid,
//         action: `changed task "${updatedTask.title}" status to ${updatedTask.status}`,
//         taskId: updatedTask._id,
//       });
//       await activity.save();
//     }

//     res.json(updatedTask);
//   } catch (err) {
//     console.error("Error updating task:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

// // ✅ Delete task
// router.delete("/:id", async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);
//     if (!task) {
//       return res.status(404).json({ error: "Task not found" });
//     }

//     await Task.findByIdAndDelete(req.params.id);

//     // Create activity
//     const activity = new Activity({
//       listId: task.listId,
//       userId: req.user.uid,
//       action: `deleted task "${task.title}"`,
//       taskId: task._id,
//     });
//     await activity.save();

//     res.json({ message: "Task deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting task:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;

const express = require("express");
const Task = require("../models/Task");
const List = require("../models/List");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

const router = express.Router();

// Helper function to get user display name
const getUserDisplayName = async (userId) => {
  try {
    const User = require("../models/User");
    const user = await User.findOne({ uid: userId });
    return user ? user.displayName || user.email : "Someone";
  } catch (error) {
    console.error("Error getting user display name:", error);
    return "Someone";
  }
};

// Helper function to create notifications for list members
const createNotificationForMembers = async (
  listId,
  excludeUserId,
  notificationData,
  io
) => {
  try {
    const list = await List.findById(listId);
    if (!list) return;

    // Get member IDs excluding the user who performed the action
    const memberIds = list.memberIds.filter(
      (memberId) => memberId !== excludeUserId
    );

    // Create notifications for each member
    const notifications = await Promise.all(
      memberIds.map(async (memberId) => {
        const notification = new Notification({
          userId: memberId,
          listId: listId,
          isRead: false,
          read: false, // Set both for compatibility
          ...notificationData,
          createdAt: new Date(),
        });
        await notification.save();
        return notification.populate("listId", "name");
      })
    );

    // Emit socket events for real-time updates
    notifications.forEach((notification) => {
      io.to(`user:${notification.userId}`).emit("notification-created", {
        notification,
      });
    });

    return notifications;
  } catch (error) {
    console.error("Error creating notifications for members:", error);
  }
};

// Create a task
router.post("/", async (req, res) => {
  try {
    const { listId, ...taskData } = req.body;

    // Check if user has permission to add tasks to this list
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user is a member of the list
    if (!list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create the task
    const newTask = new Task({
      ...taskData,
      listId,
      createdBy: req.user.uid,
      createdAt: new Date(),
    });

    await newTask.save();

    // Get user display name for notifications
    const actorName = await getUserDisplayName(req.user.uid);

    // Create activity log
    const activity = new Activity({
      listId,
      userId: req.user.uid,
      action: "task_created",
      description: `${actorName} created task "${newTask.title}"`,
      metadata: {
        taskId: newTask._id,
        taskTitle: newTask.title,
        priority: newTask.priority,
      },
      createdAt: new Date(),
    });
    await activity.save();

    // Create notifications for all list members (except the creator)
    const io = req.app.get("io");
    await createNotificationForMembers(
      listId,
      req.user.uid, // exclude the task creator
      {
        title: "New Task Created",
        message: `${actorName} created "${newTask.title}"`,
        type: "task_created",
        metadata: {
          taskId: newTask._id,
          taskTitle: newTask.title,
          actorUserId: req.user.uid,
          actorName: actorName,
          priority: newTask.priority,
        },
      },
      io
    );

    // Emit socket events
    io.to(`list:${listId}`).emit("task-created", {
      listId,
      task: newTask,
    });

    io.to(`list:${listId}`).emit("activity-created", {
      listId,
      activity,
    });

    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get all tasks
router.get("/", async (req, res) => {
  try {
    // Get all lists where user is a member
    const userLists = await List.find({
      memberIds: req.user.uid,
    }).select("_id");

    const listIds = userLists.map((list) => list._id);

    // Get tasks from those lists
    const tasks = await Task.find({
      listId: { $in: listIds },
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("Error getting tasks:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update a task
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if user has permission to edit this task
    const list = await List.findById(task.listId);
    if (!list || !list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const oldTask = { ...task.toObject() };
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    // Get user display name for notifications
    const actorName = await getUserDisplayName(req.user.uid);

    // Create activity log
    let activityDescription = `${actorName} updated task "${updatedTask.title}"`;
    let notificationMessage = `${actorName} updated "${updatedTask.title}"`;
    let notificationType = "task_updated";

    // Check for specific changes
    if (oldTask.done !== updatedTask.done && updatedTask.done) {
      activityDescription = `${actorName} completed task "${updatedTask.title}"`;
      notificationMessage = `${actorName} completed "${updatedTask.title}"`;
      notificationType = "task_completed";
    } else if (
      oldTask.assignedToUid !== updatedTask.assignedToUid &&
      updatedTask.assignedToUid
    ) {
      const assignedToName = await getUserDisplayName(
        updatedTask.assignedToUid
      );
      activityDescription = `${actorName} assigned task "${updatedTask.title}" to ${assignedToName}`;
      notificationMessage = `${actorName} assigned "${updatedTask.title}" to ${assignedToName}`;
      notificationType = "task_assigned";
    }

    const activity = new Activity({
      listId: task.listId,
      userId: req.user.uid,
      action: notificationType,
      description: activityDescription,
      metadata: {
        taskId: updatedTask._id,
        taskTitle: updatedTask.title,
        oldStatus: oldTask.status,
        newStatus: updatedTask.status,
        priority: updatedTask.priority,
      },
      createdAt: new Date(),
    });
    await activity.save();

    // Create notifications for all list members (except the person who made the change)
    const io = req.app.get("io");
    let excludeUsers = [req.user.uid];

    // For task assignment, also create a special notification for the assignee
    if (notificationType === "task_assigned" && updatedTask.assignedToUid) {
      const assignedToName = await getUserDisplayName(
        updatedTask.assignedToUid
      );

      // Create notification for the assignee
      await createNotificationForMembers(
        task.listId,
        req.user.uid, // exclude the assigner
        {
          title: "Task Assigned to You",
          message: `${actorName} assigned "${updatedTask.title}" to you`,
          type: "task_assigned",
          metadata: {
            taskId: updatedTask._id,
            taskTitle: updatedTask.title,
            actorUserId: req.user.uid,
            actorName: actorName,
            assignedTo: updatedTask.assignedToUid,
            assignedToName: assignedToName,
            priority: updatedTask.priority,
          },
        },
        io
      );
    }

    // Create general notifications for other members
    await createNotificationForMembers(
      task.listId,
      req.user.uid, // exclude the person who made the change
      {
        title:
          notificationType === "task_completed"
            ? "Task Completed"
            : notificationType === "task_assigned"
            ? "Task Assigned"
            : "Task Updated",
        message: notificationMessage,
        type: notificationType,
        metadata: {
          taskId: updatedTask._id,
          taskTitle: updatedTask.title,
          actorUserId: req.user.uid,
          actorName: actorName,
          priority: updatedTask.priority,
          oldStatus: oldTask.status,
          newStatus: updatedTask.status,
        },
      },
      io
    );

    // Emit socket events
    io.to(`list:${task.listId}`).emit("task-updated", {
      listId: task.listId,
      task: updatedTask,
    });

    io.to(`list:${task.listId}`).emit("activity-created", {
      listId: task.listId,
      activity,
    });

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if user has permission to delete this task
    const list = await List.findById(task.listId);
    if (!list || !list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Store task info before deletion
    const taskTitle = task.title;
    const listId = task.listId;

    await Task.findByIdAndDelete(req.params.id);

    // Get user display name for notifications
    const actorName = await getUserDisplayName(req.user.uid);

    // Create activity log
    const activity = new Activity({
      listId,
      userId: req.user.uid,
      action: "task_deleted",
      description: `${actorName} deleted task "${taskTitle}"`,
      metadata: {
        taskTitle: taskTitle,
      },
      createdAt: new Date(),
    });
    await activity.save();

    // Create notifications for all list members (except the deleter)
    const io = req.app.get("io");
    await createNotificationForMembers(
      listId,
      req.user.uid, // exclude the person who deleted the task
      {
        title: "Task Deleted",
        message: `${actorName} deleted "${taskTitle}"`,
        type: "task_deleted",
        metadata: {
          taskTitle: taskTitle,
          actorUserId: req.user.uid,
          actorName: actorName,
        },
      },
      io
    );

    // Emit socket events
    io.to(`list:${listId}`).emit("task-deleted", {
      listId,
      taskId: req.params.id,
    });

    io.to(`list:${listId}`).emit("activity-created", {
      listId,
      activity,
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
