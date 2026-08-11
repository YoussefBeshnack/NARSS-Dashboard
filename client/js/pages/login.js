import { requireGuest } from '../core/guard.js';
import { SELECTORS, ROUTES } from '../core/constants.js';
import { LoginFormHandler } from '../components/login-form.js';
import { authService } from '../services/auth.service.js';
import { authStore } from '../services/auth.store.js';
import { Toast } from '../components/toast.js';

// Protect page: logged-in users get redirected to dashboard
if (requireGuest()) {
  new LoginFormHandler({
    form: SELECTORS.LOGIN_FORM,
    onSubmit: async (formData) => {
      try {
        // 1. Submit to network service
        const responseData = await authService.login(formData);

        // 2. Persist session
        authStore.setSession({
          token: responseData.token,
          refreshToken: responseData.refreshToken,
          user: responseData.user,
        });

        Toast.success('Login successful! Welcome back.');

        // 3. Redirect to dashboard
        setTimeout(() => {
          window.location.href = ROUTES.DASHBOARD;
        }, 500);
      } catch (err) {
        Toast.error(err.message || 'Invalid email or password.');
        throw err;
      }
    },
  });
}