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
    if (error.message.includes("Access denied")) {
      userMessage = "You don't have permission to access this data";
    } else if (error.message.includes("Network")) {
      userMessage = "Network error. Please check your connection";
    } else if (error.message.includes("not found")) {
      userMessage = "The requested data was not found";
    }

    setError({
      message: error.message,
      userMessage,
      context,
    });
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

    try {
      console.log("🔍 Loading initial data for user:", user.uid);
      setLoading(true);
      setError(null);

      // Connect socket
      socketService.connect(user);

      // Load all data in parallel
      const [listsData, notificationsData, membersData] = await Promise.all([
        apiService.getLists(),
        apiService.getNotifications(),
        apiService.getUsers(),
      ]);

      console.log("📋 Lists loaded:", listsData.length);
      console.log("🔔 Notifications loaded:", notificationsData.length);
      console.log("👥 Members loaded:", membersData.length);

      setLists(listsData);
      setNotifications(notificationsData);
      setMembers(membersData);

      // Load tasks and activities for each list
      const tasksPromises = listsData.map((list) =>
        apiService.getTasks(list._id).catch((err) => {
          console.error(`Failed to load tasks for list ${list._id}:`, err);
          return [];
        })
      );

      const activitiesPromises = listsData.map((list) =>
        apiService.getActivities(list._id).catch((err) => {
          console.error(`Failed to load activities for list ${list._id}:`, err);
          return [];
        })
      );

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
  }, [user, handleError]);

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Task events
    unsubscribers.push(
      socketService.on("task-created", (data) => {
        setTasks((prev) => ({
          ...prev,
          [data.listId]: [...(prev[data.listId] || []), data.task],
        }));
      })
    );

    unsubscribers.push(
      socketService.on("task-updated", (data) => {
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
        setLists((prev) =>
          prev.map((list) => (list._id === data.list._id ? data.list : list))
        );
      })
    );

    // Activity events
    unsubscribers.push(
      socketService.on("activity-created", (data) => {
        setActivities((prev) => ({
          ...prev,
          [data.listId]: [data.activity, ...(prev[data.listId] || [])],
        }));
      })
    );

    // Notification events
    unsubscribers.push(
      socketService.on("notification-created", (data) => {
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

  // CRUD operations
  const createList = async (listData) => {
    if (!user) throw new Error("User not authenticated");

    try {
      console.log("🆕 Creating list:", listData);
      const newList = await apiService.createList(listData);

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
      const newTask = await apiService.createTask(listId, taskData);

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: [newTask, ...(prev[listId] || [])],
      }));

      return newTask._id;
    } catch (error) {
      handleError(error, "creating task");
      throw error;
    }
  };

  const updateTask = async (listId, taskId, taskData) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const updatedTask = await apiService.updateTask(listId, taskId, taskData);

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).map((task) =>
          task._id === taskId ? updatedTask : task
        ),
      }));
    } catch (error) {
      handleError(error, "updating task");
      throw error;
    }
  };

  const deleteTask = async (listId, taskId, taskTitle) => {
    if (!user) throw new Error("User not authenticated");

    try {
      await apiService.deleteTask(listId, taskId);

      // Update local state (will also be updated via socket)
      setTasks((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((task) => task._id !== taskId),
      }));
    } catch (error) {
      handleError(error, "deleting task");
      throw error;
    }
  };

  const inviteMember = async (listId, email, role) => {
    if (!user) throw new Error("User not authenticated");

    try {
      await apiService.inviteMember(listId, email, role);
    } catch (error) {
      handleError(error, "inviting member");
      throw error;
    }
  };

  const updateNotification = async (notificationId, updates) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const updatedNotification = await apiService.updateNotification(
        notificationId,
        updates
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? updatedNotification : notif
        )
      );
    } catch (error) {
      handleError(error, "updating notification");
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
      return role === "owner" || role === "editor";
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
