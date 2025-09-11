// src/services/apiService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

class ApiService {
  constructor() {
    this.token = localStorage.getItem("authToken");
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Check if response is HTML (likely a 404 page)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          `Server returned HTML instead of JSON. Check if the endpoint ${endpoint} exists on the backend.`
        );
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = "HTTP_ERROR";

        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          errorCode = error.code || errorCode;

          // Handle specific authentication errors
          if (response.status === 401) {
            errorCode = "UNAUTHORIZED";
            errorMessage = "Authentication required";
            // Clear invalid token
            this.setToken(null);
          } else if (response.status === 403) {
            errorCode = "FORBIDDEN";
            errorMessage =
              error.error || "Access denied - invalid or expired token";
            // Clear invalid token
            this.setToken(null);
          }
        } catch (jsonError) {
          // If we can't parse the error as JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }

        const apiError = new Error(errorMessage);
        apiError.status = response.status;
        apiError.code = errorCode;
        throw apiError;
      }

      // Handle no content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      // Enhance error messages for common connection issues
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        const enhancedError = new Error(
          "Cannot connect to backend server. Please ensure the server is running on http://localhost:5000"
        );
        enhancedError.code = "CONNECTION_FAILED";
        throw enhancedError;
      }

      if (error.message.includes("ERR_CONNECTION_REFUSED")) {
        const enhancedError = new Error(
          "Connection refused. Backend server is not running on port 5000."
        );
        enhancedError.code = "CONNECTION_REFUSED";
        throw enhancedError;
      }

      // If token was cleared due to auth error, notify about re-authentication
      if (error.status === 401 || error.status === 403) {
        const authError = new Error("Please sign in again");
        authError.code = "REAUTHENTICATION_REQUIRED";
        authError.originalError = error;
        throw authError;
      }

      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Auth methods
  async authenticateWithGoogle(googleToken) {
    // Validate token format
    if (!googleToken || typeof googleToken !== "string") {
      throw new Error("Invalid Google token: Token must be a string");
    }

    // Check if it's a proper JWT (should have 3 segments)
    const segments = googleToken.split(".");
    if (segments.length !== 3) {
      throw new Error(
        `Invalid Google token format: Expected JWT with 3 segments, got ${segments.length}`
      );
    }

    try {
      const response = await this.request("/auth/google", {
        method: "POST",
        body: JSON.stringify({ token: googleToken }),
      });

      if (response.token) {
        this.setToken(response.token);
      }

      return response;
    } catch (error) {
      // Don't set token if authentication failed
      this.setToken(null);
      throw error;
    }
  }

  async signOut() {
    this.setToken(null);
    return Promise.resolve();
  }

  // User methods
  async getUsers() {
    return this.request("/users");
  }

  // List methods
  async getLists() {
    return this.request("/lists");
  }

  async createList(listData) {
    return this.request("/lists", {
      method: "POST",
      body: JSON.stringify(listData),
    });
  }

  async updateList(listId, listData) {
    return this.request(`/lists/${listId}`, {
      method: "PUT",
      body: JSON.stringify(listData),
    });
  }

  async deleteList(listId) {
    return this.request(`/lists/${listId}`, {
      method: "DELETE",
    });
  }

  // Task methods
  async getTasks(listId) {
    return this.request("/tasks").then((tasks) =>
      tasks.filter((task) => task.listId === listId)
    );
  }

  async createTask(listId, taskData) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify({ ...taskData, listId }),
    });
  }

  async updateTask(listId, taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(listId, taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  // Activity methods
  async getActivities(listId) {
    return this.request("/activities").then((activities) =>
      activities.filter((activity) => activity.listId === listId)
    );
  }

  // Notification methods
  async getNotifications() {
    return this.request("/notifications");
  }

  async updateNotification(notificationId, updates) {
    return this.request(`/notifications/${notificationId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Invitation methods
  async inviteMember(listId, email, role) {
    return this.request(`/lists/${listId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async getInvitation(listId, email) {
    const params = new URLSearchParams({ listId, email });
    return this.request(`/invitations?${params}`);
  }
}

const apiService = new ApiService();
export default apiService;
