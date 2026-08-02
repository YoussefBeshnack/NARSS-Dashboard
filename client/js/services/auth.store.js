// js/services/auth.store.js
export class AuthStore {
  constructor() {
    this.TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;
    this.REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;
    this.USER_KEY = STORAGE_KEYS.USER_DATA;
  }

  setSession({ token, user }) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  /**
   * Clears all persisted user authentication state
   */
  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

export const authStore = new AuthStore();