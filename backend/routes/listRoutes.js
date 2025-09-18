// const express = require("express");
// const List = require("../models/List");
// const Activity = require("../models/Activity");
// const Notification = require("../models/Notification");

// const router = express.Router();

// // ✅ Get all lists (filter by user membership)
// router.get("/", async (req, res) => {
//   try {
//     const lists = await List.find({
//       $or: [{ ownerId: req.user.uid }, { memberIds: { $in: [req.user.uid] } }],
//     }).sort({ createdAt: -1 });
//     res.json(lists);
//   } catch (err) {
//     console.error("Error getting lists:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Create new list
// router.post("/", async (req, res) => {
//   try {
//     const listData = {
//       ...req.body,
//       ownerId: req.user.uid,
//       memberIds: [req.user.uid],
//       roles: new Map([[req.user.uid, "owner"]]),
//       createdAt: new Date(),
//     };

//     const newList = new List(listData);
//     await newList.save();

//     // Create welcome notification
//     const notification = new Notification({
//       userId: req.user.uid,
//       title: "List Created",
//       message: `You created the list "${newList.name}"`,
//       listId: newList._id,
//       type: "welcome",
//     });
//     await notification.save();

//     res.status(201).json(newList);
//   } catch (err) {
//     console.error("Error creating list:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

// // ✅ Get list by ID
// router.get("/:id", async (req, res) => {
//   try {
//     const list = await List.findById(req.params.id);
//     if (!list) return res.status(404).json({ error: "List not found" });

//     // Check if user has access
//     if (!list.memberIds.includes(req.user.uid)) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     res.json(list);
//   } catch (err) {
//     console.error("Error getting list:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Update list
// router.put("/:id", async (req, res) => {
//   try {
//     const list = await List.findById(req.params.id);
//     if (!list) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     // Check permissions
//     const userRole = list.roles.get(req.user.uid);
//     if (userRole !== "owner" && userRole !== "admin") {
//       return res.status(403).json({ error: "Insufficient permissions" });
//     }

//     const updatedList = await List.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     });

//     // Create activity
//     const activity = new Activity({
//       listId: updatedList._id,
//       userId: req.user.uid,
//       action: `updated list "${updatedList.name}"`,
//     });
//     await activity.save();

//     res.json(updatedList);
//   } catch (err) {
//     console.error("Error updating list:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

// // ✅ Delete list
// router.delete("/:id", async (req, res) => {
//   try {
//     const list = await List.findById(req.params.id);
//     if (!list) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     // Check if user is owner
//     if (list.ownerId !== req.user.uid) {
//       return res
//         .status(403)
//         .json({ error: "Only the owner can delete this list" });
//     }

//     await List.findByIdAndDelete(req.params.id);
//     res.json({ message: "List deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting list:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // REPLACE the invitation endpoint in your listRoutes.js with this targeted fix:

// router.post("/:id/invitations", async (req, res) => {
//   try {
//     console.log("📧 Invitation request:", {
//       listId: req.params.id,
//       body: req.body,
//       user: req.user.uid,
//     });

//     const { email, role } = req.body;
//     const listId = req.params.id;

//     // Basic validation
//     if (!email) {
//       console.log("❌ Missing email");
//       return res.status(400).json({ error: "Email is required" });
//     }

//     if (!email.includes("@")) {
//       console.log("❌ Invalid email format");
//       return res.status(400).json({ error: "Invalid email format" });
//     }

//     const list = await List.findById(listId);
//     if (!list) {
//       console.log("❌ List not found");
//       return res.status(404).json({ error: "List not found" });
//     }

//     console.log("✅ List found:", list.name);
//     console.log("📋 List members:", list.memberIds);
//     console.log("📋 List roles type:", typeof list.roles);
//     console.log("📋 List roles:", list.roles);

//     // Check if user is a member
//     if (!list.memberIds.includes(req.user.uid)) {
//       console.log("❌ User not a member");
//       return res.status(403).json({ error: "Access denied" });
//     }

//     // FIXED: Handle roles properly - check both Map and Object formats
//     let userRole;
//     if (list.roles instanceof Map) {
//       userRole = list.roles.get(req.user.uid);
//       console.log("📋 Using Map.get() for role:", userRole);
//     } else if (list.roles && typeof list.roles === "object") {
//       // Handle plain object or Mongoose Map converted to object
//       if (list.roles.get && typeof list.roles.get === "function") {
//         userRole = list.roles.get(req.user.uid);
//         console.log("📋 Using object.get() for role:", userRole);
//       } else {
//         userRole = list.roles[req.user.uid];
//         console.log("📋 Using object[key] for role:", userRole);
//       }
//     }

//     console.log("👤 Final user role:", userRole);

//     // FIXED: More permissive role check
//     if (!userRole) {
//       console.log("❌ No role found for user");
//       return res.status(403).json({
//         error: "No role found for user in this list",
//         userId: req.user.uid,
//         availableRoles: list.roles,
//       });
//     }

//     // Allow owner, admin, editor to invite (more permissive than before)
//     const canInvite = ["owner", "admin", "editor"].includes(userRole);
//     if (!canInvite) {
//       console.log("❌ Insufficient permissions:", userRole);
//       return res.status(403).json({
//         error: `Insufficient permissions. Role '${userRole}' cannot invite members`,
//         required: ["owner", "admin", "editor"],
//       });
//     }

//     const PendingInvitation = require("../models/PendingInvitation");

//     // Check if invitation already exists
//     const existingInvite = await PendingInvitation.findOne({
//       email: email.toLowerCase(),
//       listId: listId,
//     });

//     if (existingInvite) {
//       console.log("❌ Invitation already exists");
//       return res.status(400).json({
//         error: "Invitation already sent to this email for this list",
//       });
//     }

//     // Check if user is already a member
//     const existingUser = await require("../models/User").findOne({
//       email: email.toLowerCase(),
//     });

//     if (existingUser && list.memberIds.includes(existingUser.uid)) {
//       console.log("❌ User already a member");
//       return res.status(400).json({
//         error: "User is already a member of this list",
//       });
//     }

//     // Create pending invitation
//     const invitation = new PendingInvitation({
//       email: email.toLowerCase(),
//       listId: listId,
//       list: list.name,
//       role: role || "viewer",
//       invitedAt: new Date(),
//     });

//     await invitation.save();
//     console.log("✅ Invitation created successfully");

//     // Create activity
//     const activity = new Activity({
//       listId: listId,
//       userId: req.user.uid,
//       action: `invited ${email} to join as ${role || "viewer"}`,
//     });
//     await activity.save();

//     res.status(201).json({
//       message: "Invitation sent successfully",
//       invitation: {
//         email: invitation.email,
//         role: invitation.role,
//         listName: invitation.list,
//       },
//     });
//   } catch (err) {
//     console.error("❌ Invitation error:", err);
//     console.error("❌ Error stack:", err.stack);
//     res.status(500).json({
//       error: "Internal server error",
//       details: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// });

// module.exports = router;

const express = require("express");
const List = require("../models/List");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const User = require("../models/User");

const router = express.Router();

// Helper function to get user display name safely
const getUserDisplayName = async (uid) => {
  try {
    const user = await User.findOne({ uid });
    return user
      ? user.displayName || user.email || "Unknown User"
      : "Unknown User";
  } catch (error) {
    console.error("Error getting user display name:", error);
    return "Unknown User";
  }
};

// Get all lists (filter by user membership)
router.get("/", async (req, res) => {
  try {
    const lists = await List.find({
      $or: [{ ownerId: req.user.uid }, { memberIds: { $in: [req.user.uid] } }],
    }).sort({ createdAt: -1 });
    res.json(lists);
  } catch (err) {
    console.error("Error getting lists:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new list
router.post("/", async (req, res) => {
  try {
    const listData = {
      ...req.body,
      ownerId: req.user.uid,
      memberIds: [req.user.uid],
      roles: new Map([[req.user.uid, "owner"]]),
      createdAt: new Date(),
    };

    const newList = new List(listData);
    await newList.save();

    // Create welcome notification (non-critical)
    try {
      const notification = new Notification({
        userId: req.user.uid,
        title: "List Created",
        message: `You created the list "${newList.name}"`,
        listId: newList._id,
        type: "welcome",
        isRead: false,
        read: false,
        createdAt: new Date(),
      });
      await notification.save();

      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${req.user.uid}`).emit("list-created", {
          list: newList,
          notification: notification,
        });
      }
    } catch (notifError) {
      console.log("Non-critical: Failed to create notification:", notifError);
    }

    res.status(201).json(newList);
  } catch (err) {
    console.error("Error creating list:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get list by ID
router.get("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });

    // Check if user has access
    if (!list.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(list);
  } catch (err) {
    console.error("Error getting list:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update list
router.put("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check permissions
    const userRole = list.roles.get(req.user.uid);
    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const updatedList = await List.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Create activity (non-critical)
    try {
      const actorName = await getUserDisplayName(req.user.uid);
      const activity = new Activity({
        listId: updatedList._id,
        userId: req.user.uid,
        action: "list_updated",
        description: `${actorName} updated list "${updatedList.name}"`,
        metadata: {
          listName: updatedList.name,
          changes: req.body,
        },
        createdAt: new Date(),
      });
      await activity.save();
    } catch (activityError) {
      console.log("Non-critical: Failed to create activity:", activityError);
    }

    res.json(updatedList);
  } catch (err) {
    console.error("Error updating list:", err);
    res.status(400).json({ error: err.message });
  }
});

// Delete list
router.delete("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if user is owner
    if (list.ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete this list" });
    }

    await List.findByIdAndDelete(req.params.id);
    res.json({ message: "List deleted successfully" });
  } catch (err) {
    console.error("Error deleting list:", err);
    res.status(500).json({ error: err.message });
  }
});

// Send invitation - Based on your working old code with minimal additions
router.post("/:id/invitations", async (req, res) => {
  try {
    console.log("📧 Invitation request:", {
      listId: req.params.id,
      body: req.body,
      user: req.user.uid,
    });

    const { email, role } = req.body;
    const listId = req.params.id;

    // Basic validation
    if (!email) {
      console.log("❌ Missing email");
      return res.status(400).json({ error: "Email is required" });
    }

    if (!email.includes("@")) {
      console.log("❌ Invalid email format");
      return res.status(400).json({ error: "Invalid email format" });
    }

    const list = await List.findById(listId);
    if (!list) {
      console.log("❌ List not found");
      return res.status(404).json({ error: "List not found" });
    }

    console.log("✅ List found:", list.name);
    console.log("📋 List members:", list.memberIds);
    console.log("📋 List roles type:", typeof list.roles);
    console.log("📋 List roles:", list.roles);

    // Check if user is a member
    if (!list.memberIds.includes(req.user.uid)) {
      console.log("❌ User not a member");
      return res.status(403).json({ error: "Access denied" });
    }

    // Handle roles properly - check both Map and Object formats
    let userRole;
    if (list.roles instanceof Map) {
      userRole = list.roles.get(req.user.uid);
      console.log("📋 Using Map.get() for role:", userRole);
    } else if (list.roles && typeof list.roles === "object") {
      // Handle plain object or Mongoose Map converted to object
      if (list.roles.get && typeof list.roles.get === "function") {
        userRole = list.roles.get(req.user.uid);
        console.log("📋 Using object.get() for role:", userRole);
      } else {
        userRole = list.roles[req.user.uid];
        console.log("📋 Using object[key] for role:", userRole);
      }
    }

    console.log("👤 Final user role:", userRole);

    if (!userRole) {
      console.log("❌ No role found for user");
      return res.status(403).json({
        error: "No role found for user in this list",
        userId: req.user.uid,
        availableRoles: list.roles,
      });
    }

    // Allow owner, admin, editor to invite
    const canInvite = ["owner", "admin", "editor"].includes(userRole);
    if (!canInvite) {
      console.log("❌ Insufficient permissions:", userRole);
      return res.status(403).json({
        error: `Insufficient permissions. Role '${userRole}' cannot invite members`,
        required: ["owner", "admin", "editor"],
      });
    }

    // Import PendingInvitation model
    const PendingInvitation = require("../models/PendingInvitation");

    // Check if invitation already exists
    const existingInvite = await PendingInvitation.findOne({
      email: email.toLowerCase(),
      listId: listId,
    });

    if (existingInvite) {
      console.log("❌ Invitation already exists");
      return res.status(400).json({
        error: "Invitation already sent to this email for this list",
      });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser && list.memberIds.includes(existingUser.uid)) {
      console.log("❌ User already a member");
      return res.status(400).json({
        error: "User is already a member of this list",
      });
    }

    // Create pending invitation
    const invitation = new PendingInvitation({
      email: email.toLowerCase(),
      listId: listId,
      list: list.name,
      role: role || "viewer",
      invitedBy: req.user.uid, // Added this field
      invitedAt: new Date(),
    });

    await invitation.save();
    console.log("✅ Invitation created successfully");

    // Create activity (non-critical - won't fail the invitation)
    try {
      const activity = new Activity({
        listId: listId,
        userId: req.user.uid,
        action: `invited ${email} to join as ${role || "viewer"}`,
        createdAt: new Date(),
      });
      await activity.save();
    } catch (activityError) {
      console.log("Non-critical: Failed to create activity:", activityError);
    }

    // Create notifications (non-critical - won't fail the invitation)
    try {
      const actorName = await getUserDisplayName(req.user.uid);

      // Notify other members
      const memberIds = list.memberIds.filter((id) => id !== req.user.uid);
      if (memberIds.length > 0) {
        const notifications = memberIds.map((memberId) => ({
          userId: memberId,
          title: "Member Invited",
          message: `${actorName} invited ${email} to join "${list.name}" as ${
            role || "viewer"
          }`,
          listId: listId,
          type: "member_invited",
          isRead: false,
          read: false,
          createdAt: new Date(),
        }));

        await Notification.insertMany(notifications);
      }

      // If the invited user exists, notify them directly
      if (existingUser) {
        const userNotification = new Notification({
          userId: existingUser.uid,
          title: "List Invitation",
          message: `${actorName} invited you to join "${list.name}" as ${
            role || "viewer"
          }`,
          listId: listId,
          type: "invitation_received",
          isRead: false,
          read: false,
          createdAt: new Date(),
        });
        await userNotification.save();
      }
    } catch (notificationError) {
      console.log(
        "Non-critical: Failed to create notifications:",
        notificationError
      );
    }

    res.status(201).json({
      message: "Invitation sent successfully",
      invitation: {
        email: invitation.email,
        role: invitation.role,
        listName: invitation.list,
      },
    });
  } catch (err) {
    console.error("❌ Invitation error:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
