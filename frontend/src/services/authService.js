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
        const parsedUser = JSON.parse(userData);

        // Validate the token is not expired
        if (this.isTokenValid(token)) {
          this.user = parsedUser;
          apiService.setToken(token);
          console.log("User restored from localStorage:", this.user.email);
        } else {
          console.log("Stored token is expired, clearing auth state");
          this.clearAuthState();
        }
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        this.clearAuthState();
      }
    }
  }

  // Check if JWT token is still valid (not expired)
  isTokenValid(token) {
    try {
      if (!token) return false;

      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;

      // Check if token is expired (with 5 minute buffer)
      return payload.exp && payload.exp > currentTime + 300;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  // Clear authentication state
  clearAuthState() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    this.user = null;
    apiService.setToken(null);
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

      // Validate the Google token format
      if (!googleToken || typeof googleToken !== "string") {
        throw new Error("Invalid Google token provided");
      }

      const response = await apiService.authenticateWithGoogle(googleToken);

      if (response.token && response.user) {
        // Save JWT token
        localStorage.setItem("authToken", response.token);
        apiService.setToken(response.token);

        // Save user data
        this.user = response.user;
        localStorage.setItem("userData", JSON.stringify(this.user));

        console.log("Google authentication successful:", this.user?.email);

        // Notify listeners
        this.notifyAuthListeners();

        return this.user;
      } else {
        throw new Error("Authentication response missing token or user data");
      }
    } catch (error) {
      console.error("Google authentication failed:", error);

      // Clear any partial auth state
      this.clearAuthState();
      this.notifyAuthListeners();

      throw error;
    }
  }

  async signOut() {
    try {
      console.log("Signing out...");

      // Clear API service token
      await apiService.signOut();

      // Clear all auth state
      this.clearAuthState();

      console.log("Sign out successful");

      // Notify listeners
      this.notifyAuthListeners();
    } catch (error) {
      console.error("Sign out error:", error);
      // Still clear local state even if API call fails
      this.clearAuthState();
      this.notifyAuthListeners();
      throw error;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  isAuthenticated() {
    const token = localStorage.getItem("authToken");
    return !!this.user && !!token && this.isTokenValid(token);
  }

  getAuthToken() {
    const token = localStorage.getItem("authToken");
    return this.isTokenValid(token) ? token : null;
  }
}

const authService = new AuthService();
export default authService;
