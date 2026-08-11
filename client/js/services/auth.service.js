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
}

export const authService = new AuthService();
