import { authStore } from './js/services/auth.store.js';
import { ROUTES } from './js/core/constants.js';

if (authStore.isAuthenticated()) {
  window.location.href = ROUTES.DASHBOARD;
} else {
  window.location.href = ROUTES.LOGIN;
}