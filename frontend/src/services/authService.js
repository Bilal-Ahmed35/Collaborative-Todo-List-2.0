// src/services/authService.js
import apiService from "./apiService";

class AuthService {
  constructor() {
    this.user = null;
    this.authListeners = [];
    this.initializeAuth();
  }

  initializeAuth() {
    // Check for stored token & user on app start
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");

    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
        apiService.setToken(token);
        console.log("User restored from localStorage:", this.user.email);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        this.signOut();
      }
    }
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authListeners.push(callback);

    // Call immediately with current state
    callback(this.user);

    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  // Notify all listeners of auth state changes
  notifyAuthListeners() {
    this.authListeners.forEach((callback) => {
      try {
        callback(this.user);
      } catch (error) {
        console.error("Error in auth listener:", error);
      }
    });
  }

  async signInWithGoogle(googleToken) {
    try {
      console.log("Authenticating with Google...");

      const response = await apiService.authenticateWithGoogle(googleToken);

      if (response.token) {
        // Save JWT to localStorage + ApiService
        localStorage.setItem("authToken", response.token);
        apiService.setToken(response.token);
      }

      if (response.user) {
        this.user = response.user;
        localStorage.setItem("userData", JSON.stringify(this.user));
      }

      console.log("Google authentication successful:", this.user?.email);

      // Notify listeners
      this.notifyAuthListeners();

      return this.user;
    } catch (error) {
      console.error("Google authentication failed:", error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log("Signing out...");

      // Clear API service token
      await apiService.signOut();

      // Clear local storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");

      // Clear user state
      this.user = null;

      console.log("Sign out successful");

      // Notify listeners
      this.notifyAuthListeners();
    } catch (error) {
      console.error("Sign out error:", error);
      // Still clear local state even if API call fails
      this.user = null;
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      this.notifyAuthListeners();
      throw error;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.user;
  }

  getAuthToken() {
    return localStorage.getItem("authToken");
  }
}

const authService = new AuthService();
export default authService;
