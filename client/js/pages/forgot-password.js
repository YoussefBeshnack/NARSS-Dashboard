import { requireGuest } from "../core/guard.js";
import { SELECTORS, ROUTES } from "../core/constants.js";
import { ForgotPasswordFormHandler } from "../components/forgot-password-form.js";
import { authService } from "../services/auth.service.js";
import { Toast } from "../components/toast.js";

// Protect page: logged-in users get redirected to dashboard
if (requireGuest()) {
  const handler = new ForgotPasswordFormHandler({
    form: SELECTORS.FORGOT_PASSWORD_FORM,
    onSubmit: async (formData) => {
      const responseData = await authService.forgotPassword(formData);

      Toast.success(responseData.message || "Password reset token generated.");

      // If backend returned a reset token, auto-fill it into Step 2 for convenience
      if (responseData.resetToken) {
        const tokenInput = document.getElementById("resetToken");
        if (tokenInput) tokenInput.value = responseData.resetToken;
      }

      // Transition to Step 2
      document.getElementById("reset-heading").textContent = "Set New Password";
      document.getElementById("reset-subheading").textContent = "Enter your reset token and new password";
      document.getElementById("step-1-container").classList.add("d-none");
      document.getElementById("step-2-container").classList.remove("d-none");
    },
  });

  // Handle Step 2 submit
  const step2Btn = document.getElementById("step-2-btn");
  if (step2Btn) {
    step2Btn.addEventListener("click", async () => {
      const resetToken = document.getElementById("resetToken").value.trim();
      const newPassword = document.getElementById("newPassword").value.trim();

      if (!resetToken) {
        Toast.error("Reset token is required.");
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        Toast.error("New password must be at least 6 characters.");
        return;
      }

      try {
        step2Btn.disabled = true;
        step2Btn.innerHTML = '<span>Updating...</span>';

        const res = await authService.resetPassword({ resetToken, newPassword });
        Toast.success(res.message || "Password reset successfully! Redirecting to login...");

        setTimeout(() => {
          window.location.href = ROUTES.LOGIN;
        }, 1500);
      } catch (err) {
        Toast.error(err.message || "Failed to reset password.");
        step2Btn.disabled = false;
        step2Btn.innerHTML = '<span class="fw-medium">Update Password</span><i class="fa-solid fa-check ms-1"></i>';
      }
    });
  }

  // Back button handler
  const back = document.getElementById("go-back");
  if (back) {
    back.addEventListener("click", () => {
      window.location.href = ROUTES.LOGIN;
    });
  }
}
