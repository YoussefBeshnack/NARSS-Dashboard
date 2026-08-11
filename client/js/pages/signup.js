import { requireGuest } from '../core/guard.js';
import { SELECTORS, ROUTES } from '../core/constants.js';
import { SignupFormHandler } from '../components/signup-form.js';
import { authService } from '../services/auth.service.js';
import { authStore } from '../services/auth.store.js';
import { Toast } from '../components/toast.js';

// Protect page: logged-in users get redirected to dashboard
if (requireGuest()) {
  new SignupFormHandler({
    form: SELECTORS.SIGNUP_FORM,
    onSubmit: async (formData) => {
      try {
        // 1. Submit to network service
        const responseData = await authService.signup({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role || 'Researcher',
        });

        // 2. Persist session
        authStore.setSession({
          token: responseData.token,
          refreshToken: responseData.refreshToken,
          user: responseData.user,
        });

        Toast.success('Account created successfully! Redirecting...');

        // 3. Redirect to dashboard
        setTimeout(() => {
          window.location.href = ROUTES.DASHBOARD;
        }, 500);
      } catch (err) {
        Toast.error(err.message || 'Registration failed.');
        throw err;
      }
    },
  });
}