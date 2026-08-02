import { authService } from '../services/auth.service.js';
import { authStore } from '../services/auth.store.js';
import { ROUTES } from './constants.js';

/**
 * Logs out the user, invalidates local session, and redirects to login page.
 */
export const handleLogout = async () => {
  try {
    // 1. Optional: Notify backend API to invalidate session/token on the server
    await authService.logout();
  } catch (error) {
    // Log error for debugging, but don't block client cleanup
    console.warn('Server logout error or network failure:', error.message);
  } finally {
    // 2. Always wipe token and user data from localStorage
    authStore.clearSession();

    // 3. Clear any session-level redirect memory if present
    sessionStorage.removeItem('redirect_after_login');

    // 4. Redirect user to the login page
    window.location.href = ROUTES.LOGIN;
  }
};