import { authStore } from "../services/auth.store.js";
import { ROUTES } from "./constants.js";

/**
 * Ensures the user is logged in.
 * Use on protected pages like Dashboard or Settings.
 */
export const requireAuth = () => {
  if (authStore.isAuthenticated()) return true;

  // Save current path if you want to redirect back after login
  sessionStorage.setItem("redirect_after_login", window.location.pathname);
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

/**
 * Ensures the user didnt open via url copy like
 * Use on guest pages like Forgot Password.
 */
export const enforceInternalNavigation = () => {
  const isDirectEntry = window.history.length <= 1;
  const isExternalReferrer = !document.referrer.startsWith(window.location.origin);

  // If opened directly or coming from outside your site
  if (!(isDirectEntry || isExternalReferrer)) return true;

  window.location.href = ROUTES.LOGIN;
  return false;
};
