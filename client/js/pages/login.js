import { requireGuest } from '../core/guard.js';
import { SELECTORS, ROUTES } from '../core/constants.js';
import { LoginFormHandler } from '../components/login-form.js';
import { authService } from '../services/auth.service.js';
import { authStore } from '../services/auth.store.js';

// Protect page: logged-in users get redirected to dashboard
if (requireGuest()) {
  new LoginFormHandler({
    form: SELECTORS.LOGIN_FORM,
    onSubmit: async (formData) => {
      // 1. Submit to network service
      const responseData = await authService.login(formData);

      // 2. Persist session
      authStore.setSession({
        token: responseData.token,
        user: responseData.user,
      });

      // 3. Redirect to dashboard
      window.location.href = ROUTES.DASHBOARD;
    },
  });
}