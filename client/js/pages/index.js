import { authStore } from '../services/auth.store.js';
import { ROUTES } from '../core/constants.js';

if (authStore.isAuthenticated()) {
  window.location.href = ROUTES.DASHBOARD;
} else {
  window.location.href = ROUTES.LOGIN;
}