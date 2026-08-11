import { apiClient } from "./api.js";
import { API_CONFIG } from "../core/constants.js";

export class AuthService {
  /**
   * Sends user login credentials to API
   * @param {Object} credentials - { email, password }
   */
  async login(credentials) {
    return apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, credentials);
  }

  /**
   * Sends new user signup payload to API
   * @param {Object} userData - { fullName, email, password, role }
   */
  async signup(userData) {
    return apiClient.post(API_CONFIG.ENDPOINTS.SIGNUP, userData);
  }

  /**
   * Request password reset token via email
   * @param {Object} credentials - { email }
   */
  async forgotPassword(credentials) {
    return apiClient.post(API_CONFIG.ENDPOINTS.FORGOTPASSWORD, credentials);
  }

  /**
   * Submit reset token and new password
   * @param {Object} data - { resetToken, newPassword }
   */
  async resetPassword(data) {
    return apiClient.post("/auth/reset-password", data);
  }

  /**
   * Get active user profile
   */
  async getMe() {
    return apiClient.get("/auth/me");
  }

  /**
   * Search registered users by name or email (max 20 results)
   * @param {string} search - Query string
   */
  async searchUsers(search = "") {
    const endpoint = search ? `/auth/users?search=${encodeURIComponent(search)}` : "/auth/users";
    return apiClient.get(endpoint);
  }

  /**
   * Fetch ALL registered users (for Admin User Management view)
   */
  async getAllUsers() {
    return apiClient.get("/auth/users?limit=all");
  }

  /**
   * Update a user's system role (Admin only)
   * @param {string} userId - Target user ID
   * @param {string} role   - New role string
   */
  async updateUserRole(userId, role) {
    return apiClient.put(`/auth/users/${userId}`, { role });
  }
}

export const authService = new AuthService();
