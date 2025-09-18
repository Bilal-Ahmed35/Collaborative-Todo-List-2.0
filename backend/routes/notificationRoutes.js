// const express = require("express");
// const Notification = require("../models/Notification");

// const router = express.Router();

// // Get notifications for the current user
// router.get("/", async (req, res) => {
//   try {
//     const notifications = await Notification.find({
//       userId: req.user.uid,
//     }).sort({ createdAt: -1 });
//     res.json(notifications);
//   } catch (err) {
//     console.error("Error getting notifications:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Create notification
// router.post("/", async (req, res) => {
//   try {
//     const newNotification = new Notification({
//       ...req.body,
//       createdAt: new Date(),
//     });
//     await newNotification.save();
//     res.status(201).json(newNotification);
//   } catch (err) {
//     console.error("Error creating notification:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

// // Update notification (mark as read)
// router.put("/:id", async (req, res) => {
//   try {
//     const notification = await Notification.findById(req.params.id);
//     if (!notification) {
//       return res.status(404).json({ error: "Notification not found" });
//     }

//     // Check if notification belongs to current user
//     if (notification.userId !== req.user.uid) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const updated = await Notification.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );

//     res.json(updated);
//   } catch (err) {
//     console.error("Error updating notification:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Mark notification as read
// router.put("/:id/read", async (req, res) => {
//   try {
//     const notification = await Notification.findById(req.params.id);
//     if (!notification) {
//       return res.status(404).json({ error: "Notification not found" });
//     }

//     // Check if notification belongs to current user
//     if (notification.userId !== req.user.uid) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const updated = await Notification.findByIdAndUpdate(
//       req.params.id,
//       { isRead: true },
//       { new: true }
//     );

//     res.json(updated);
//   } catch (err) {
//     console.error("Error marking notification as read:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Delete notification
// router.delete("/:id", async (req, res) => {
//   try {
//     const notification = await Notification.findById(req.params.id);
//     if (!notification) {
//       return res.status(404).json({ error: "Notification not found" });
//     }

//     // Check if notification belongs to current user
//     if (notification.userId !== req.user.uid) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     await Notification.findByIdAndDelete(req.params.id);
//     res.json({ message: "Notification deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting notification:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
const express = require("express");
const Notification = require("../models/Notification");
const List = require("../models/List");
const User = require("../models/User");

const router = express.Router();

// Get notifications for the current user
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.uid,
    })
      .populate("listId", "name")
      .sort({ createdAt: -1 })
      .limit(50); // Limit to latest 50 notifications

    res.json(notifications);
  } catch (err) {
    console.error("Error getting notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get unread notification count
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.uid,
      $or: [
        { isRead: false },
        { read: false },
        { isRead: { $exists: false } },
        { read: { $exists: false } },
      ],
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ error: err.message });
  }
});

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// Mark all notifications as read
router.put("/mark-all-read", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user.uid,
        $or: [
          { isRead: false },
          { read: false },
          { isRead: { $exists: false } },
          { read: { $exists: false } },
        ],
      },
      {
        isRead: true,
        read: true,
        readAt: new Date(),
      }
    );

    const updatedNotifications = await Notification.find({
      userId: req.user.uid,
    })
      .populate("listId", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      message: "All notifications marked as read",
      markedCount: result.modifiedCount,
      notifications: updatedNotifications,
      unreadCount: 0,
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mark top 3 notifications as read
router.put("/mark-top-read", async (req, res) => {
  try {
    const { limit = 3 } = req.body;

    const topNotifications = await Notification.find({
      userId: req.user.uid,
      $or: [
        { isRead: false },
        { read: false },
        { isRead: { $exists: false } },
        { read: { $exists: false } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    let markedCount = 0;
    if (topNotifications.length > 0) {
      const topIds = topNotifications.map((n) => n._id);
      const result = await Notification.updateMany(
        { _id: { $in: topIds } },
        {
          isRead: true,
          read: true,
          readAt: new Date(),
        }
      );
      markedCount = result.modifiedCount;
    }

    // Get updated notifications and unread count
    const updatedNotifications = await Notification.find({
      userId: req.user.uid,
    })
      .populate("listId", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.uid,
      $or: [
        { isRead: false },
        { read: false },
        { isRead: { $exists: false } },
        { read: { $exists: false } },
      ],
    });

    res.json({
      message: `Top ${markedCount} notifications marked as read`,
      markedCount,
      notifications: updatedNotifications,
      unreadCount,
    });
  } catch (err) {
    console.error("Error marking top notifications as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Clear old read notifications (cleanup utility)
router.delete("/clear-read", async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));

    const result = await Notification.deleteMany({
      userId: req.user.uid,
      $and: [
        { $or: [{ isRead: true }, { read: true }] },
        {
          $or: [
            { readAt: { $lt: cutoffDate } },
            { createdAt: { $lt: cutoffDate } },
          ],
        },
      ],
    });

    res.json({
      message: `Cleared ${result.deletedCount} old read notifications`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error clearing old notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create notification
router.post("/", async (req, res) => {
  try {
    const newNotification = new Notification({
      ...req.body,
      isRead: false,
      read: false,
      createdAt: new Date(),
    });
    await newNotification.save();

    const populatedNotification = await newNotification.populate(
      "listId",
      "name"
    );
    res.status(201).json(populatedNotification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(400).json({ error: err.message });
  }
});

// Mark specific notification as read by ID
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        read: true,
        readAt: new Date(),
      },
      { new: true }
    ).populate("listId", "name");

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: req.user.uid,
      $or: [
        { isRead: false },
        { read: false },
        { isRead: { $exists: false } },
        { read: { $exists: false } },
      ],
    });

    res.json({
      notification: updated,
      unreadCount,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update notification (general update)
router.put("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Add readAt timestamp if marking as read
    const updateData = { ...req.body };
    if (
      (updateData.isRead === true || updateData.read === true) &&
      !updateData.readAt
    ) {
      updateData.readAt = new Date();
    }

    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("listId", "name");

    res.json(updated);
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if notification belongs to current user
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: err.message });
  }
});

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
    if (io) {
      notifications.forEach((notification) => {
        io.to(`user:${notification.userId}`).emit("notification-created", {
          notification,
        });
      });
    }

    return notifications;
  } catch (error) {
    console.error("Error creating notifications for members:", error);
  }
};

// Helper function to get user display name
const getUserDisplayName = async (userId) => {
  try {
    const user = await User.findOne({ uid: userId });
    return user ? user.displayName || user.email || "Unknown User" : "Someone";
  } catch (error) {
    console.error("Error getting user display name:", error);
    return "Someone";
  }
};

// Export helper functions for use in other routes
router.createNotificationForMembers = createNotificationForMembers;
router.getUserDisplayName = getUserDisplayName;

module.exports = router;
