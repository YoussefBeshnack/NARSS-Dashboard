import { authStore } from '../services/auth.store.js';
import { ROUTES } from './constants.js';

/**
 * Ensures the user is logged in.
 * Use on protected pages like Dashboard or Settings.
 */
export const requireAuth = () => {
  if (authStore.isAuthenticated()) return true;
  
  // Save current path if you want to redirect back after login
  sessionStorage.setItem('redirect_after_login', window.location.pathname);
  window.location.href = ROUTES.LOGIN;
  return false;
};

/**
 * Ensures the user is NOT logged in.
 * Use on guest pages like Login or Signup.
 */
export const requireGuest = () => {
  if (!authStore.isAuthenticated()) return true;

  window.location.href = ROUTES.DASHBOARD;
  return false;
};