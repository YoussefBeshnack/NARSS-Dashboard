import { API_CONFIG, MESSAGES, ROUTES } from '../core/constants.js';
import { authStore } from './auth.store.js';

export class ApiClient {
  constructor(baseUrl = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Helper to decode standard JWT payloads (Base64Url) without third-party libs
   */
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Checks if JWT is within `bufferSeconds` of expiration
   */
  isTokenExpiringSoon(token, bufferSeconds = 30) {
    if (!token) return true;
    const payload = this.parseJwt(token);
    if (!payload || !payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp - currentTime < bufferSeconds;
  }

  /**
   * Performs the token refresh network request
   */
  async refreshAccessToken() {
    const refreshToken = authStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Reuse existing promise if a refresh is already in progress
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.REFRESH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Refresh token invalid or expired');
        }

        const data = await response.json();
        
        // Update store with new access token (and new refresh token if rotated)
        authStore.setSession({
          token: data.token || data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
        });

        return data.token || data.accessToken;
      } catch (err) {
        authStore.clearSession();
        window.location.href = ROUTES.LOGIN;
        throw err;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  getHeaders(customHeaders = {}) {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    });

    const token = authStore.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const isRefreshRequest = endpoint === API_CONFIG.ENDPOINTS.REFRESH;

    // 1. Proactive Refresh Check: If token is expiring soon, refresh before sending request
    if (!isRefreshRequest && authStore.isAuthenticated()) {
      const currentToken = authStore.getToken();
      if (this.isTokenExpiringSoon(currentToken)) {
        try {
          await this.refreshAccessToken();
        } catch {
          // If refresh fails, session clear/redirect happens inside refreshAccessToken
          return;
        }
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers),
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      throw new Error(MESSAGES.NETWORK_ERROR || 'Network connection failed.');
    }

    // 2. Reactive 401 Interception (Fallback if server invalidated token earlier)
    if (response.status === 401 && !isRefreshRequest) {
      try {
        const newToken = await this.refreshAccessToken();
        
        // Retry original request with newly acquired token
        config.headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(url, config);
        
        if (!retryResponse.ok) {
          throw new Error('Request failed after token refresh retry');
        }

        return await retryResponse.json().catch(() => ({}));
      } catch (refreshErr) {
        authStore.clearSession();
        window.location.href = ROUTES.LOGIN;
        throw new Error('Session expired. Please log in again.');
      }
    }

    let data = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      const errorMessage = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  // HTTP Helpers
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();