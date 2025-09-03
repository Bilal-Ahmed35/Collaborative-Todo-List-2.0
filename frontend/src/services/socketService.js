// Socket.IO service for real-time updates
import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.currentUser = null;
    this.currentListId = null;
  }

  connect(user) {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl =
      process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

    this.socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.currentUser = user;

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket.id);
      if (this.currentUser) {
        this.socket.emit("join-user", this.currentUser.uid);
      }
      if (this.currentListId) {
        this.socket.emit("join-list", this.currentListId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔌 Socket reconnected after", attemptNumber, "attempts");
      if (this.currentUser) {
        this.socket.emit("join-user", this.currentUser.uid);
      }
      if (this.currentListId) {
        this.socket.emit("join-list", this.currentListId);
      }
    });

    // Listen for real-time updates
    this.socket.on("task-created", this.handleTaskCreated.bind(this));
    this.socket.on("task-updated", this.handleTaskUpdated.bind(this));
    this.socket.on("task-deleted", this.handleTaskDeleted.bind(this));
    this.socket.on("list-updated", this.handleListUpdated.bind(this));
    this.socket.on("activity-created", this.handleActivityCreated.bind(this));
    this.socket.on(
      "notification-created",
      this.handleNotificationCreated.bind(this)
    );
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentUser = null;
      this.currentListId = null;
      console.log("🔌 Socket disconnected manually");
    }
  }

  joinList(listId) {
    if (this.currentListId) {
      this.socket?.emit("leave-list", this.currentListId);
    }

    this.currentListId = listId;

    if (this.socket?.connected && listId) {
      this.socket.emit("join-list", listId);
      console.log("🔌 Joined list:", listId);
    }
  }

  leaveList() {
    if (this.currentListId && this.socket?.connected) {
      this.socket.emit("leave-list", this.currentListId);
      console.log("🔌 Left list:", this.currentListId);
    }
    this.currentListId = null;
  }

  // Event handlers
  handleTaskCreated(data) {
    this.notifyListeners("task-created", data);
  }

  handleTaskUpdated(data) {
    this.notifyListeners("task-updated", data);
  }

  handleTaskDeleted(data) {
    this.notifyListeners("task-deleted", data);
  }

  handleListUpdated(data) {
    this.notifyListeners("list-updated", data);
  }

  handleActivityCreated(data) {
    this.notifyListeners("activity-created", data);
  }

  handleNotificationCreated(data) {
    this.notifyListeners("notification-created", data);
  }

  // Listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

export default new SocketService();
