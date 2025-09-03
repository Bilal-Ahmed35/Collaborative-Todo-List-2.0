// API service for communicating with MongoDB backend
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `HTTP error! status: ${response.status}`
        );
      }

      // Handle no content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Auth methods
  async authenticateWithGoogle(googleToken) {
    const response = await this.request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ token: googleToken }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
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
    return this.request(`/lists/${listId}/tasks`);
  }

  async createTask(listId, taskData) {
    return this.request(`/lists/${listId}/tasks`, {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(listId, taskId, taskData) {
    return this.request(`/lists/${listId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(listId, taskId) {
    return this.request(`/lists/${listId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  // Activity methods
  async getActivities(listId) {
    return this.request(`/lists/${listId}/activities`);
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

export default new ApiService();
