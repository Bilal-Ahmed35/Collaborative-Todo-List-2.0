// import { useState, useEffect, useCallback } from "react";
// import apiService from "../services/apiService";
// import socketService from "../services/socketService";

// export function useMongoData(user) {
//   const [lists, setLists] = useState([]);
//   const [tasks, setTasks] = useState({});
//   const [activities, setActivities] = useState({});
//   const [notifications, setNotifications] = useState([]);
//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Helper function to handle errors consistently
//   const handleError = useCallback((error, context) => {
//     console.error(`❌ Error in ${context}:`, error);

//     let userMessage = "An unexpected error occurred";
//     if (error.message.includes("Server returned HTML")) {
//       userMessage =
//         "Backend server is not responding correctly. Please check if the server is running.";
//     } else if (error.message.includes("Failed to fetch")) {
//       userMessage =
//         "Cannot connect to server. Please check if the backend is running on http://localhost:5000";
//     } else if (error.message.includes("Access denied")) {
//       userMessage = "You don't have permission to access this data";
//     } else if (error.message.includes("Network")) {
//       userMessage = "Network error. Please check your connection";
//     } else if (error.message.includes("not found")) {
//       userMessage = "The requested data was not found";
//     } else if (error.message.includes("Invalid Google token")) {
//       userMessage = "Authentication failed. Please try signing in again.";
//     }

//     setError({
//       message: error.message,
//       userMessage,
//       context,
//     });
//   }, []);

//   // Load initial data

//   const loadInitialData = useCallback(async () => {
//     if (!user) {
//       setLists([]);
//       setTasks({});
//       setActivities({});
//       setNotifications([]);
//       setMembers([]);
//       setLoading(false);
//       setError(null);
//       return;
//     }

//     // Add token check before making requests
//     const token = localStorage.getItem("authToken");
//     if (!token) {
//       console.log("No auth token available, waiting for authentication...");
//       setLoading(false);
//       setError({
//         message: "Authentication required",
//         userMessage: "Please sign in again",
//         context: "missing auth token",
//       });
//       return;
//     }

//     // Ensure apiService has the token
//     apiService.setToken(token);

//     try {
//       console.log("Loading initial data for user:", user.uid);
//       setLoading(true);
//       setError(null);

//       // Test connectivity first
//       try {
//         const response = await fetch("http://localhost:5000/health");
//         if (!response.ok) {
//           throw new Error("Server health check failed");
//         }
//         console.log("Backend server is responding");
//       } catch (healthError) {
//         throw new Error(
//           "Backend server is not accessible. Please ensure the server is running on http://localhost:5000"
//         );
//       }

//       // Connect socket
//       socketService.connect(user);

//       // Load all data in parallel with timeout
//       const timeout = 10000; // 10 seconds
//       const timeoutPromise = new Promise((_, reject) =>
//         setTimeout(
//           () =>
//             reject(
//               new Error("Request timeout - server took too long to respond")
//             ),
//           timeout
//         )
//       );

//       const [listsData, notificationsData, membersData] = await Promise.race([
//         Promise.all([
//           apiService.getLists(),
//           apiService.getNotifications(),
//           apiService.getUsers(),
//         ]),
//         timeoutPromise,
//       ]);

//       console.log("Lists loaded:", listsData.length);
//       console.log("Notifications loaded:", notificationsData.length);
//       console.log("Members loaded:", membersData.length);

//       setLists(listsData);
//       setNotifications(notificationsData);
//       setMembers(membersData);

//       // Load tasks and activities for each list
//       const tasksPromises = listsData.map(async (list) => {
//         try {
//           return await apiService.getTasks(list._id);
//         } catch (err) {
//           console.error(`Failed to load tasks for list ${list._id}:`, err);
//           return [];
//         }
//       });

//       const activitiesPromises = listsData.map(async (list) => {
//         try {
//           return await apiService.getActivities(list._id);
//         } catch (err) {
//           console.error(`Failed to load activities for list ${list._id}:`, err);
//           return [];
//         }
//       });

//       const [tasksResults, activitiesResults] = await Promise.all([
//         Promise.all(tasksPromises),
//         Promise.all(activitiesPromises),
//       ]);

//       // Build tasks and activities objects
//       const tasksMap = {};
//       const activitiesMap = {};

//       listsData.forEach((list, index) => {
//         tasksMap[list._id] = tasksResults[index];
//         activitiesMap[list._id] = activitiesResults[index];
//       });

//       setTasks(tasksMap);
//       setActivities(activitiesMap);
//     } catch (error) {
//       handleError(error, "loading initial data");
//     } finally {
//       setLoading(false);
//     }
//   }, [user, handleError]);

//   // Set up real-time listeners
//   useEffect(() => {
//     if (!user) return;

//     const unsubscribers = [];

//     // Task events
//     unsubscribers.push(
//       socketService.on("task-created", (data) => {
//         console.log("📝 Task created via socket:", data);
//         setTasks((prev) => ({
//           ...prev,
//           [data.listId]: [data.task, ...(prev[data.listId] || [])],
//         }));
//       })
//     );

//     unsubscribers.push(
//       socketService.on("task-updated", (data) => {
//         console.log("✏️ Task updated via socket:", data);
//         setTasks((prev) => ({
//           ...prev,
//           [data.listId]: (prev[data.listId] || []).map((task) =>
//             task._id === data.task._id ? data.task : task
//           ),
//         }));
//       })
//     );

//     unsubscribers.push(
//       socketService.on("task-deleted", (data) => {
//         console.log("🗑️ Task deleted via socket:", data);
//         setTasks((prev) => ({
//           ...prev,
//           [data.listId]: (prev[data.listId] || []).filter(
//             (task) => task._id !== data.taskId
//           ),
//         }));
//       })
//     );

//     // List events
//     unsubscribers.push(
//       socketService.on("list-updated", (data) => {
//         console.log("📋 List updated via socket:", data);
//         setLists((prev) =>
//           prev.map((list) => (list._id === data.list._id ? data.list : list))
//         );
//       })
//     );

//     // Activity events
//     unsubscribers.push(
//       socketService.on("activity-created", (data) => {
//         console.log("📊 Activity created via socket:", data);
//         setActivities((prev) => ({
//           ...prev,
//           [data.listId]: [data.activity, ...(prev[data.listId] || [])],
//         }));
//       })
//     );

//     // Notification events
//     unsubscribers.push(
//       socketService.on("notification-created", (data) => {
//         console.log("🔔 Notification created via socket:", data);
//         if (data.notification.userId === user.uid) {
//           setNotifications((prev) => [data.notification, ...prev]);
//         }
//       })
//     );

//     return () => {
//       unsubscribers.forEach((unsubscribe) => unsubscribe());
//     };
//   }, [user]);

//   // Load data when user changes
//   useEffect(() => {
//     loadInitialData();

//     return () => {
//       if (!user) {
//         socketService.disconnect();
//       }
//     };
//   }, [user, loadInitialData]);

//   // CRUD operations with better error handling
//   const createList = async (listData) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       console.log("🆕 Creating list:", listData);
//       const newList = await apiService.createList({
//         ...listData,
//         ownerId: user.uid,
//         memberIds: [user.uid],
//         roles: { [user.uid]: "owner" },
//       });

//       // Update local state
//       setLists((prev) => [newList, ...prev]);
//       setTasks((prev) => ({ ...prev, [newList._id]: [] }));
//       setActivities((prev) => ({ ...prev, [newList._id]: [] }));

//       console.log("✅ List created:", newList._id);
//       return newList._id;
//     } catch (error) {
//       handleError(error, "creating list");
//       throw error;
//     }
//   };

//   const createTask = async (listId, taskData) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       console.log("🆕 Creating task in list:", listId);
//       const newTask = await apiService.createTask(listId, {
//         ...taskData,
//         createdBy: user.uid,
//       });

//       // Update local state (will also be updated via socket)
//       setTasks((prev) => ({
//         ...prev,
//         [listId]: [newTask, ...(prev[listId] || [])],
//       }));

//       console.log("✅ Task created:", newTask._id);
//       return newTask._id;
//     } catch (error) {
//       handleError(error, "creating task");
//       throw error;
//     }
//   };

//   const updateTask = async (listId, taskId, taskData) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       console.log("✏️ Updating task:", taskId);
//       const updatedTask = await apiService.updateTask(listId, taskId, taskData);

//       // Update local state (will also be updated via socket)
//       setTasks((prev) => ({
//         ...prev,
//         [listId]: (prev[listId] || []).map((task) =>
//           task._id === taskId ? updatedTask : task
//         ),
//       }));

//       console.log("✅ Task updated:", taskId);
//     } catch (error) {
//       handleError(error, "updating task");
//       throw error;
//     }
//   };

//   const deleteTask = async (listId, taskId, taskTitle) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       console.log("🗑️ Deleting task:", taskId);
//       await apiService.deleteTask(listId, taskId);

//       // Update local state (will also be updated via socket)
//       setTasks((prev) => ({
//         ...prev,
//         [listId]: (prev[listId] || []).filter((task) => task._id !== taskId),
//       }));

//       console.log("✅ Task deleted:", taskId);
//     } catch (error) {
//       handleError(error, "deleting task");
//       throw error;
//     }
//   };

//   const inviteMember = async (listId, email, role) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       console.log("📧 Inviting member to list:", listId, email);
//       await apiService.inviteMember(listId, email, role);
//       console.log("✅ Invitation sent to:", email);
//     } catch (error) {
//       handleError(error, "inviting member");
//       throw error;
//     }
//   };

//   const updateNotification = async (notificationId, updates) => {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       const updatedNotification = await apiService.updateNotification(
//         notificationId,
//         updates
//       );

//       // Update local state
//       setNotifications((prev) =>
//         prev.map((notif) =>
//           notif._id === notificationId ? updatedNotification : notif
//         )
//       );

//       console.log("✅ Notification updated:", notificationId);
//     } catch (error) {
//       handleError(error, "updating notification");
//       throw error;
//     }
//   };

//   // Permission helper functions
//   const getUserRole = useCallback(
//     (listId) => {
//       const list = lists.find((l) => l._id === listId);
//       if (!list || !user) return null;

//       // Convert Map to regular object for easier access
//       const roles =
//         list.roles instanceof Map ? Object.fromEntries(list.roles) : list.roles;

//       return roles[user.uid] || null;
//     },
//     [lists, user]
//   );

//   const canUserEdit = useCallback(
//     (listId) => {
//       const role = getUserRole(listId);
//       return role === "owner" || role === "admin" || role === "editor";
//     },
//     [getUserRole]
//   );

//   const canUserView = useCallback(
//     (listId) => {
//       const list = lists.find((l) => l._id === listId);
//       return list?.memberIds?.includes(user?.uid) || false;
//     },
//     [lists, user]
//   );

//   // Join/leave list for socket
//   const setActiveList = useCallback((listId) => {
//     socketService.joinList(listId);
//   }, []);

//   return {
//     lists,
//     tasks,
//     activities,
//     notifications,
//     members,
//     loading,
//     error,
//     // CRUD operations
//     createList,
//     createTask,
//     updateTask,
//     deleteTask,
//     inviteMember,
//     updateNotification,
//     // Permission helpers
//     getUserRole,
//     canUserEdit,
//     canUserView,
//     // Socket management
//     setActiveList,
//     // Utilities
//     refreshData: loadInitialData,
//   };
// }

import { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import socketService from "../services/socketService";

export function useMongoData(user) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState({});
  const [activities, setActivities] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to handle errors consistently
  const handleError = useCallback((error, context) => {
    console.error(`❌ Error in ${context}:`, error);

    let userMessage = "An unexpected error occurred";
    if (error.message.includes("Server returned HTML")) {
      userMessage =
        "Backend server is not responding correctly. Please check if the server is running.";
    } else if (error.message.includes("Failed to fetch")) {
      userMessage =
        "Cannot connect to server. Please check if the backend is running on http://localhost:5000";
    } else if (error.message.includes("Access denied")) {
      userMessage = "You don't have permission to access this data";
    } else if (error.message.includes("Network")) {
      userMessage = "Network error. Please check your connection";
    } else if (error.message.includes("not found")) {
      userMessage = "The requested data was not found";
    } else if (error.message.includes("Invalid Google token")) {
      userMessage = "Authentication failed. Please try signing in again.";
    }

    setError({
      message: error.message,
      userMessage,
      context,
    });
  }, []);

  // Helper function to safely extract notifications array from API response
  const extractNotificationsArray = useCallback((response) => {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.notifications)) {
      return response.notifications;
    }
    if (response && Array.isArray(response.data)) {
      return response.data;
    }
    console.warn("Unexpected notifications response format:", response);
    return [];
  }, []);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!user) {
      setLists([]);
      setTasks({});
      setActivities({});
      setNotifications([]);
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Add token check before making requests
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("No auth token available, waiting for authentication...");
      setLoading(false);
      setError({
        message: "Authentication required",
        userMessage: "Please sign in again",
        context: "missing auth token",
      });
      return;
    }

    // Ensure apiService has the token
    apiService.setToken(token);

    try {
      console.log("Loading initial data for user:", user.uid);
      setLoading(true);
      setError(null);

      // Test connectivity first
      try {
        const response = await fetch("http://localhost:5000/health");
        if (!response.ok) {
          throw new Error("Server health check failed");
        }
        console.log("Backend server is responding");
      } catch (healthError) {
        throw new Error(
          "Backend server is not accessible. Please ensure the server is running on http://localhost:5000"
        );
      }

      // Connect socket
      socketService.connect(user);

      // Load all data in parallel with timeout
      const timeout = 10000; // 10 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Request timeout - server took too long to respond")
            ),
          timeout
        )
      );

      const [listsData, notificationsResponse, membersData] =
        await Promise.race([
          Promise.all([
            apiService.getLists(),
            apiService.getNotifications(),
            apiService.getUsers(),
          ]),
          timeoutPromise,
        ]);

      // Extract notifications array safely
      const notificationsData = extractNotificationsArray(
        notificationsResponse
      );

      console.log("Lists loaded:", listsData.length);
      console.log("Notifications loaded:", notificationsData.length);
      console.log("Members loaded:", membersData.length);

      setLists(listsData);
      setNotifications(notificationsData);
      setMembers(membersData);

      // Load tasks and activities for each list
      const tasksPromises = listsData.map(async (list) => {
        try {
          return await apiService.getTasks(list._id);
        } catch (err) {
          console.error(`Failed to load tasks for list ${list._id}:`, err);
          return [];
        }
      });

      const activitiesPromises = listsData.map(async (list) => {
        try {
          return await apiService.getActivities(list._id);
        } catch (err) {
          console.error(`Failed to load activities for list ${list._id}:`, err);
          return [];
        }
      });

      const [tasksResults, activitiesResults] = await Promise.all([
        Promise.all(tasksPromises),
        Promise.all(activitiesPromises),
      ]);

      // Build tasks and activities objects
      const tasksMap = {};
      const activitiesMap = {};

      listsData.forEach((list, index) => {
        tasksMap[list._id] = tasksResults[index];
        activitiesMap[list._id] = activitiesResults[index];
      });

      setTasks(tasksMap);
      setActivities(activitiesMap);
    } catch (error) {
      handleError(error, "loading initial data");
    } finally {
      setLoading(false);
    }
  }, [user, handleError, extractNotificationsArray]);

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Task events
    unsubscribers.push(
      socketService.on("task-created", (data) => {
        console.log("📝 Task created via socket:", data);
        setTasks((prev) => ({
          ...prev,
          [data.listId]: [data.task, ...(prev[data.listId] || [])],
        }));
      })
    );

    unsubscribers.push(
      socketService.on("task-updated", (data) => {
        console.log("✏️ Task updated via socket:", data);
        setTasks((prev) => ({
          ...prev,
          [data.listId]: (prev[data.listId] || []).map((task) =>
            task._id === data.task._id ? data.task : task
          ),
        }));
      })
    );

    unsubscribers.push(
      socketService.on("task-deleted", (data) => {
        console.log("🗑️ Task deleted via socket:", data);
        setTasks((prev) => ({
          ...prev,
          [data.listId]: (prev[data.listId] || []).filter(
            (task) => task._id !== data.taskId
          ),
        }));
      })
    );

    // List events
    unsubscribers.push(
      socketService.on("list-updated", (data) => {
        console.log("📋 List updated via socket:", data);
        setLists((prev) =>
          prev.map((list) => (list._id === data.list._id ? data.list : list))
        );
      })
    );

    // Activity events
    unsubscribers.push(
      socketService.on("activity-created", (data) => {
        console.log("📊 Activity created via socket:", data);
        setActivities((prev) => ({
          ...prev,
          [data.listId]: [data.activity, ...(prev[data.listId] || [])],
        }));
      })
    );

    // Notification events
    unsubscribers.push(
      socketService.on("notification-created", (data) => {
        console.log("🔔 Notification created via socket:", data);
        if (data.notification.userId === user.uid) {
          setNotifications((prev) => [data.notification, ...prev]);
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    loadInitialData();

    return () => {
      if (!user) {
        socketService.disconnect();
      }
    };
  }, [user, loadInitialData]);

  // CRUD operations with better error handling
  const createList = async (listData) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("🆕 Creating list:", listData);
      const newList = await apiService.createList({
        ...listData,
        ownerId: user.uid,
        memberIds: [user.uid],
        roles: { [user.uid]: "owner" },
      });

      // Update local state
      setLists((prev) => [newList, ...prev]);
      setTasks((prev) => ({ ...prev, [newList._id]: [] }));
      setActivities((prev) => ({ ...prev, [newList._id]: [] }));

      console.log("✅ List created:", newList._id);
      return newList._id;
    } catch (error) {
      handleError(error, "creating list");
      throw error;
    }
  };

  const createTask = async (listId, taskData) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("🆕 Creating task in list:", listId);
      const newTask = await apiService.createTask(listId, {
        ...taskData,
        createdBy: user.uid,
      });

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: [newTask, ...(prev[listId] || [])],
      }));

      console.log("✅ Task created:", newTask._id);
      return newTask._id;
    } catch (error) {
      handleError(error, "creating task");
      throw error;
    }
  };

  const updateTask = async (listId, taskId, taskData) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("✏️ Updating task:", taskId);
      const updatedTask = await apiService.updateTask(listId, taskId, taskData);

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).map((task) =>
          task._id === taskId ? updatedTask : task
        ),
      }));

      console.log("✅ Task updated:", taskId);
    } catch (error) {
      handleError(error, "updating task");
      throw error;
    }
  };

  const deleteTask = async (listId, taskId, taskTitle) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("🗑️ Deleting task:", taskId);
      await apiService.deleteTask(listId, taskId);

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((task) => task._id !== taskId),
      }));

      console.log("✅ Task deleted:", taskId);
    } catch (error) {
      handleError(error, "deleting task");
      throw error;
    }
  };

  const inviteMember = async (listId, email, role) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("📧 Inviting member to list:", listId, email);
      await apiService.inviteMember(listId, email, role);
      console.log("✅ Invitation sent to:", email);
    } catch (error) {
      handleError(error, "inviting member");
      throw error;
    }
  };

  const updateNotification = async (notificationId, updates) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const response = await apiService.updateNotification(
        notificationId,
        updates
      );

      // Handle different response formats
      const updatedNotification = response.notification || response;

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? updatedNotification : notif
        )
      );

      console.log("✅ Notification updated:", notificationId);
    } catch (error) {
      handleError(error, "updating notification");
      throw error;
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("📤 Marking all notifications as read");
      const response = await apiService.markAllNotificationsAsRead();

      // Extract notifications array from response
      const updatedNotifications = extractNotificationsArray(response);

      // Update local state with notifications array
      setNotifications(updatedNotifications);

      console.log("✅ All notifications marked as read");
      return response; // Return full response for additional data like unread count
    } catch (error) {
      handleError(error, "marking all notifications as read");
      throw error;
    }
  };

  const markTopNotificationsAsRead = async () => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("📤 Marking top notifications as read");
      const response = await apiService.markTopNotificationsAsRead();

      // Extract notifications array from response
      const updatedNotifications = extractNotificationsArray(response);

      // Update local state with notifications array
      setNotifications(updatedNotifications);

      console.log("✅ Top notifications marked as read");
      return response; // Return full response for additional data like unread count
    } catch (error) {
      handleError(error, "marking top notifications as read");
      throw error;
    }
  };

  // Permission helper functions
  const getUserRole = useCallback(
    (listId) => {
      const list = lists.find((l) => l._id === listId);
      if (!list || !user) return null;

      // Convert Map to regular object for easier access
      const roles =
        list.roles instanceof Map ? Object.fromEntries(list.roles) : list.roles;

      return roles[user.uid] || null;
    },
    [lists, user]
  );

  const canUserEdit = useCallback(
    (listId) => {
      const role = getUserRole(listId);
      return role === "owner" || role === "admin" || role === "editor";
    },
    [getUserRole]
  );

  const canUserView = useCallback(
    (listId) => {
      const list = lists.find((l) => l._id === listId);
      return list?.memberIds?.includes(user?.uid) || false;
    },
    [lists, user]
  );

  // Join/leave list for socket
  const setActiveList = useCallback((listId) => {
    socketService.joinList(listId);
  }, []);

  return {
    lists,
    tasks,
    activities,
    notifications,
    members,
    loading,
    error,
    // CRUD operations
    createList,
    createTask,
    updateTask,
    deleteTask,
    inviteMember,
    updateNotification,
    markAllNotificationsAsRead,
    markTopNotificationsAsRead,
    // Permission helpers
    getUserRole,
    canUserEdit,
    canUserView,
    // Socket management
    setActiveList,
    // Utilities
    refreshData: loadInitialData,
  };
}
