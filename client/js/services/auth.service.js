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
   * @param {Object} userData - { fullName, email, password }
   */
  async signup(userData) {
    return apiClient.post(API_CONFIG.ENDPOINTS.SIGNUP, userData);
  }

  /**
   * Optional server-side logout request
   */
  async logout() {
    return apiClient.post(API_CONFIG.ENDPOINTS.LOGOUT);
  }

  /**
   * * Optional server-side password reset request
   * @param {object} credentials - { email }
   */

  async forgotPassword(credentials) {
    return apiClient.post(API_CONFIG.ENDPOINTS.FORGOTPASSWORD, credentials);
  }
}

export const authService = new AuthService();
