import { requireGuest, enforceInternalNavigation } from "../core/guard.js";
import { SELECTORS, ROUTES } from "../core/constants.js";
import { ForgotPasswordFormHandler } from "../components/forgot-password-form.js";
import { authService } from "../services/auth.service.js";
import { authStore } from "../services/auth.store.js";

// Protect page: logged-in users get redirected to dashboard
if (requireGuest() && enforceInternalNavigation()) {
  console.log("A");
  new ForgotPasswordFormHandler({
    form: SELECTORS.FORGOT_PASSWORD_FORM,
    onSubmit: async (formData) => {
      // 1. Submit to network service
      const responseData = await authService.forgotPassword(formData);

      // 2. Persist session
      authStore.setSession({
        token: responseData.token,
        user: responseData.user,
      });

      // 3. Redirect to dashboard
      window.location.href = ROUTES.LOGIN;
    },
  });

  // Attach immediately! No DOMContentLoaded wrapper needed in modules.
  const back = document.getElementById("go-back");

  if (back) {
    console.log("exists");
    back.addEventListener("click", () => {
      console.log("Hello");
      history.back();
    });
  } else {
    console.warn("Could not find #go-back element in DOM!");
  }
}
