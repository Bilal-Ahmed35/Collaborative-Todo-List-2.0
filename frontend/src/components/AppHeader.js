// import React, { useState } from "react";
// import {
//   AppBar,
//   Toolbar,
//   Typography,
//   TextField,
//   IconButton,
//   Badge,
//   Tooltip,
//   Avatar,
//   Menu,
//   MenuItem,
//   Box,
//   Button,
//   Divider,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   ListItemText,
//   ListItemAvatar,
// } from "@mui/material";
// import {
//   Search as SearchIcon,
//   Notifications as NotificationsIcon,
//   DarkMode as DarkModeIcon,
//   LightMode as LightModeIcon,
//   Logout as LogoutIcon,
//   NotificationsNone as NotificationsNoneIcon,
//   Circle as CircleIcon,
// } from "@mui/icons-material";
// import authService from "../services/authService";
// import { formatDate } from "../utils/helpers";

// export default function AppHeader({
//   user,
//   searchTerm,
//   setSearchTerm,
//   darkMode,
//   setDarkMode,
//   unreadNotifications,
//   notificationAnchor,
//   setNotificationAnchor,
//   notifications,
//   updateNotification,
// }) {
//   const [signOutDialog, setSignOutDialog] = useState(false);

//   const markNotificationAsRead = async (notificationId) => {
//     try {
//       await updateNotification(notificationId, { read: true });
//       console.log("✅ Notification marked as read:", notificationId);
//     } catch (error) {
//       console.error("❌ Error marking notification as read:", error);
//     }
//   };

//   const markAllNotificationsAsRead = async () => {
//     try {
//       const unreadNotifs = notifications.filter((n) => !n.read);
//       console.log("📤 Marking all notifications as read:", unreadNotifs.length);

//       // Update to use _id (MongoDB) instead of id (Firebase)
//       const promises = unreadNotifs.map((notif) =>
//         updateNotification(notif._id, { read: true })
//       );

//       await Promise.all(promises);
//       setNotificationAnchor(null);
//       console.log("✅ All notifications marked as read");
//     } catch (error) {
//       console.error("❌ Error marking all notifications as read:", error);
//     }
//   };

//   const handleSignOut = async () => {
//     try {
//       // Use authService instead of Firebase auth
//       await authService.signOut();
//       setSignOutDialog(false);
//     } catch (error) {
//       console.error("Sign out error:", error);
//     }
//   };

//   const handleNotificationClick = (notification) => {
//     // Mark as read when clicked
//     if (!notification.read) {
//       // Update to use _id (MongoDB) instead of id (Firebase)
//       markNotificationAsRead(notification._id);
//     }
//     // Close menu after a short delay to show the read state change
//     setTimeout(() => {
//       setNotificationAnchor(null);
//     }, 300);
//   };

//   const getNotificationIcon = (notification) => {
//     if (notification.type === "invitation") return "🎉";
//     if (notification.type === "task_assignment") return "📝";
//     if (notification.type === "task_completion") return "✅";
//     if (notification.type === "welcome") return "👋";
//     if (notification.type === "invitation_accepted") return "🤝";
//     if (notification.type === "invitation_declined") return "❌";
//     return "🔔";
//   };

//   // Sort notifications by date, unread first
//   const sortedNotifications = [...notifications].sort((a, b) => {
//     // Unread notifications first
//     if (a.read !== b.read) {
//       return a.read ? 1 : -1;
//     }
//     // Then by date (newest first)
//     // Handle both Date objects and ISO strings from MongoDB
//     const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
//     const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
//     return dateB.getTime() - dateA.getTime();
//   });

//   console.log("🔔 Notifications in header:", {
//     total: notifications.length,
//     unread: unreadNotifications.length,
//     sorted: sortedNotifications.length,
//   });

//   return (
//     <>
//       <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
//         <Toolbar sx={{ display: "flex", gap: 2 }}>
//           <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
//             Collab Todo
//           </Typography>

//           {/* Search */}
//           <TextField
//             size="small"
//             placeholder="Search lists..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             sx={{
//               "& .MuiInputBase-root": {
//                 color: "white",
//                 "& fieldset": { borderColor: "rgba(255,255,255,0.5)" },
//                 "&:hover fieldset": { borderColor: "white" },
//                 "&.Mui-focused fieldset": { borderColor: "white" },
//               },
//               "& .MuiInputBase-input::placeholder": {
//                 color: "rgba(255,255,255,0.7)",
//               },
//             }}
//             InputProps={{
//               startAdornment: <SearchIcon sx={{ color: "white", mr: 1 }} />,
//             }}
//           />

//           {/* Notifications */}
//           <Tooltip title={`${unreadNotifications.length} unread notifications`}>
//             <IconButton
//               color="inherit"
//               onClick={(e) => setNotificationAnchor(e.currentTarget)}
//             >
//               <Badge
//                 badgeContent={unreadNotifications.length}
//                 color="error"
//                 max={99}
//               >
//                 <NotificationsIcon />
//               </Badge>
//             </IconButton>
//           </Tooltip>

//           {/* Dark Mode Toggle */}
//           <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
//             <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
//               {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
//             </IconButton>
//           </Tooltip>

//           {/* User Profile */}
//           <Tooltip title={user.displayName || user.email}>
//             <Avatar
//               src={user.photoURL || ""}
//               alt={user.displayName || user.email}
//               sx={{ width: 32, height: 32 }}
//             />
//           </Tooltip>

//           <Tooltip title="Sign Out">
//             <IconButton color="inherit" onClick={() => setSignOutDialog(true)}>
//               <LogoutIcon />
//             </IconButton>
//           </Tooltip>
//         </Toolbar>
//       </AppBar>

//       {/* Notifications Menu */}
//       <Menu
//         anchorEl={notificationAnchor}
//         open={Boolean(notificationAnchor)}
//         onClose={() => setNotificationAnchor(null)}
//         PaperProps={{
//           sx: {
//             width: 380,
//             maxHeight: 500,
//             "& .MuiMenuItem-root": {
//               whiteSpace: "normal",
//               minHeight: "auto",
//             },
//           },
//         }}
//         anchorOrigin={{
//           vertical: "bottom",
//           horizontal: "right",
//         }}
//         transformOrigin={{
//           vertical: "top",
//           horizontal: "right",
//         }}
//       >
//         {/* Header */}
//         <Box
//           sx={{
//             p: 2,
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             borderBottom: 1,
//             borderColor: "divider",
//           }}
//         >
//           <Typography variant="h6">Notifications</Typography>
//           {unreadNotifications.length > 0 && (
//             <Button
//               size="small"
//               onClick={markAllNotificationsAsRead}
//               variant="outlined"
//             >
//               Mark all read
//             </Button>
//           )}
//         </Box>

//         {/* Notifications List */}
//         <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
//           {sortedNotifications.length === 0 ? (
//             <MenuItem disabled>
//               <Box sx={{ textAlign: "center", py: 2, width: "100%" }}>
//                 <NotificationsNoneIcon
//                   sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
//                 />
//                 <Typography variant="body2" color="text.secondary">
//                   No notifications yet
//                 </Typography>
//               </Box>
//             </MenuItem>
//           ) : (
//             sortedNotifications.map((notif) => (
//               <MenuItem
//                 key={notif._id} /* Updated to use _id for MongoDB */
//                 onClick={() => handleNotificationClick(notif)}
//                 sx={{
//                   py: 1.5,
//                   px: 2,
//                   borderLeft: !notif.read
//                     ? "3px solid"
//                     : "3px solid transparent",
//                   borderColor: !notif.read ? "primary.main" : "transparent",
//                   bgcolor: !notif.read ? "action.hover" : "transparent",
//                   "&:hover": {
//                     bgcolor: !notif.read ? "action.selected" : "action.hover",
//                   },
//                 }}
//               >
//                 <ListItemAvatar sx={{ minWidth: 40 }}>
//                   <Box
//                     sx={{
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       fontSize: "1.5rem",
//                     }}
//                   >
//                     {getNotificationIcon(notif)}
//                   </Box>
//                 </ListItemAvatar>
//                 <ListItemText
//                   primary={
//                     <Box
//                       sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
//                     >
//                       <Typography
//                         variant="body2"
//                         fontWeight={!notif.read ? "bold" : "normal"}
//                         sx={{ flexGrow: 1 }}
//                       >
//                         {notif.title}
//                       </Typography>
//                       {!notif.read && (
//                         <CircleIcon
//                           sx={{
//                             fontSize: 8,
//                             color: "primary.main",
//                             mt: 0.5,
//                           }}
//                         />
//                       )}
//                     </Box>
//                   }
//                   secondary={
//                     <Box>
//                       <Typography
//                         variant="body2"
//                         color="text.secondary"
//                         sx={{ mb: 0.5 }}
//                       >
//                         {notif.message}
//                       </Typography>
//                       <Typography variant="caption" color="text.secondary">
//                         {formatDate(notif.createdAt)}
//                       </Typography>
//                     </Box>
//                   }
//                 />
//               </MenuItem>
//             ))
//           )}
//         </Box>

//         {notifications.length > 10 && (
//           <Box
//             sx={{
//               p: 1,
//               textAlign: "center",
//               borderTop: 1,
//               borderColor: "divider",
//             }}
//           >
//             <Typography variant="caption" color="text.secondary">
//               Showing recent notifications
//             </Typography>
//           </Box>
//         )}
//       </Menu>

//       {/* Sign Out Confirmation Dialog */}
//       <Dialog open={signOutDialog} onClose={() => setSignOutDialog(false)}>
//         <DialogTitle>Sign Out</DialogTitle>
//         <DialogContent>
//           <Typography>
//             Are you sure you want to sign out? Your data will be saved and
//             synced when you sign back in.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setSignOutDialog(false)}>Cancel</Button>
//           <Button onClick={handleSignOut} variant="contained" color="error">
//             Sign Out
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// }

import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  TextField,
  IconButton,
  Badge,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";
import authService from "../services/authService";
import { formatDate } from "../utils/helpers";

export default function AppHeader({
  user,
  searchTerm,
  setSearchTerm,
  darkMode,
  setDarkMode,
  unreadNotifications,
  notificationAnchor,
  setNotificationAnchor,
  notifications,
  updateNotification,
  markAllNotificationsAsRead,
  markTopNotificationsAsRead,
}) {
  const [signOutDialog, setSignOutDialog] = useState(false);
  const [hasAutoMarkedTop, setHasAutoMarkedTop] = useState(false);

  // Auto-mark top 3 notifications as read when menu opens
  useEffect(() => {
    if (
      notificationAnchor &&
      !hasAutoMarkedTop &&
      unreadNotifications.length > 0
    ) {
      const topUnreadCount = Math.min(3, unreadNotifications.length);
      if (topUnreadCount > 0) {
        console.log(
          `🔔 Auto-marking top ${topUnreadCount} notifications as read`
        );
        markTopNotificationsAsRead();
        setHasAutoMarkedTop(true);
      }
    }

    // Reset the flag when menu closes
    if (!notificationAnchor) {
      setHasAutoMarkedTop(false);
    }
  }, [
    notificationAnchor,
    unreadNotifications.length,
    hasAutoMarkedTop,
    markTopNotificationsAsRead,
  ]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, { isRead: true, read: true }); // Update both fields
      console.log("✅ Notification marked as read:", notificationId);
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log("📤 Marking all notifications as read");
      await markAllNotificationsAsRead();
      setNotificationAnchor(null);
      console.log("✅ All notifications marked as read");
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setSignOutDialog(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked (if not already read) - check both fields
    const isRead = notification.isRead || notification.read;
    if (!isRead) {
      markNotificationAsRead(notification._id);
    }

    // Close menu after a short delay to show the read state change
    setTimeout(() => {
      setNotificationAnchor(null);
    }, 300);
  };

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case "invite":
      case "invitation_accepted":
        return "🎉";
      case "task_created":
      case "task_assigned":
        return "📝";
      case "task_completed":
        return "✅";
      case "task_updated":
        return "✏️";
      case "task_deleted":
        return "🗑️";
      case "welcome":
        return "👋";
      case "invitation_declined":
        return "❌";
      case "list_updated":
        return "📋";
      case "member_added":
        return "👥";
      case "member_removed":
        return "👋";
      default:
        return "🔔";
    }
  };

  const getNotificationMessage = (notification) => {
    const actorName = notification.metadata?.actorName || "Someone";
    const listName = notification.listId?.name || "a list";

    switch (notification.type) {
      case "task_created":
        return `${actorName} created "${notification.metadata?.taskTitle}" in ${listName}`;
      case "task_updated":
        return `${actorName} updated "${notification.metadata?.taskTitle}" in ${listName}`;
      case "task_completed":
        return `${actorName} completed "${notification.metadata?.taskTitle}" in ${listName}`;
      case "task_deleted":
        return `${actorName} deleted "${notification.metadata?.taskTitle}" from ${listName}`;
      case "task_assigned":
        return `${actorName} assigned "${notification.metadata?.taskTitle}" to ${notification.metadata?.assignedToName} in ${listName}`;
      case "list_updated":
        return `${actorName} updated the list "${listName}"`;
      case "member_added":
        return `${actorName} was added to "${listName}"`;
      case "member_removed":
        return `${actorName} was removed from "${listName}"`;
      case "invitation_accepted":
        return `${actorName} accepted your invitation to "${listName}"`;
      case "invitation_declined":
        return `${actorName} declined your invitation to "${listName}"`;
      default:
        return notification.message;
    }
  };

  // Sort notifications by date, unread first
  const sortedNotifications = [...notifications].sort((a, b) => {
    // Unread notifications first (check both isRead and read for compatibility)
    const aRead = a.isRead || a.read;
    const bRead = b.isRead || b.read;
    if (aRead !== bRead) {
      return aRead ? 1 : -1;
    }
    // Then by date (newest first)
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", gap: 2 }}>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Collab Todo
          </Typography>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                color: "white",
                "& fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                "&:hover fieldset": { borderColor: "white" },
                "&.Mui-focused fieldset": { borderColor: "white" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,0.7)",
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: "white", mr: 1 }} />,
            }}
          />

          {/* Notifications */}
          <Tooltip title={`${unreadNotifications.length} unread notifications`}>
            <IconButton
              color="inherit"
              onClick={(e) => setNotificationAnchor(e.currentTarget)}
            >
              <Badge
                badgeContent={unreadNotifications.length}
                color="error"
                max={99}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Dark Mode Toggle */}
          <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
            <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Tooltip title={user.displayName || user.email}>
            <Avatar
              src={user.photoURL || ""}
              alt={user.displayName || user.email}
              sx={{ width: 32, height: 32 }}
            />
          </Tooltip>

          <Tooltip title="Sign Out">
            <IconButton color="inherit" onClick={() => setSignOutDialog(true)}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            "& .MuiMenuItem-root": {
              whiteSpace: "normal",
              minHeight: "auto",
            },
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6">Notifications</Typography>
          {unreadNotifications.length > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              variant="outlined"
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Auto-read indicator */}
        {hasAutoMarkedTop && unreadNotifications.length > 0 && (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="primary">
              Top 3 notifications automatically marked as read
            </Typography>
          </Box>
        )}

        {/* Notifications List */}
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {sortedNotifications.length === 0 ? (
            <MenuItem disabled>
              <Box sx={{ textAlign: "center", py: 2, width: "100%" }}>
                <NotificationsNoneIcon
                  sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No notifications yet
                </Typography>
              </Box>
            </MenuItem>
          ) : (
            sortedNotifications.map((notif) => (
              <MenuItem
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderLeft: !(notif.isRead || notif.read)
                    ? "3px solid"
                    : "3px solid transparent",
                  borderColor: !(notif.isRead || notif.read)
                    ? "primary.main"
                    : "transparent",
                  bgcolor: !(notif.isRead || notif.read)
                    ? "action.hover"
                    : "transparent",
                  "&:hover": {
                    bgcolor: !(notif.isRead || notif.read)
                      ? "action.selected"
                      : "action.hover",
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    {getNotificationIcon(notif)}
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={
                          !(notif.isRead || notif.read) ? "bold" : "normal"
                        }
                        sx={{ flexGrow: 1 }}
                      >
                        {notif.title}
                      </Typography>
                      {!(notif.isRead || notif.read) && (
                        <CircleIcon
                          sx={{
                            fontSize: 8,
                            color: "primary.main",
                            mt: 0.5,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {getNotificationMessage(notif)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(notif.createdAt)}
                      </Typography>
                    </Box>
                  }
                />
              </MenuItem>
            ))
          )}
        </Box>

        {notifications.length > 50 && (
          <Box
            sx={{
              p: 1,
              textAlign: "center",
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Showing recent 50 notifications
            </Typography>
          </Box>
        )}
      </Menu>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutDialog} onClose={() => setSignOutDialog(false)}>
        <DialogTitle>Sign Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out? Your data will be saved and
            synced when you sign back in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignOutDialog(false)}>Cancel</Button>
          <Button onClick={handleSignOut} variant="contained" color="error">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
