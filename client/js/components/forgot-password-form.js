import { BaseFormHandler } from "./base-form.js";
import { validateEmail, validatePassword, validateLoginForm } from "../core/validator.js";
import { MESSAGES } from "../core/constants.js";

export class ForgotPasswordFormHandler extends BaseFormHandler {
  constructor(config) {
    super(config);
    this.initFields();
  }

  initFields() {
    const emailInput = this.form.querySelector('[name="email"]');

    if (emailInput) {
      emailInput.addEventListener("blur", () => this.validateField("email"));
      emailInput.addEventListener("input", () => this.clearError("email"));
    }
  }

  validateField(fieldName) {
    const values = this.getValues();
    let result = { isValid: true, message: "" };

    if (fieldName === "email") result = validateEmail(values.email);

    if (!result.isValid) {
      this.showError(fieldName, result.message);
    } else {
      this.clearError(fieldName);
    }

    return result.isValid;
  }

  async handleSubmit(event) {
    super.handleSubmit(event);

    const values = this.getValues();
    const validation = validateLoginForm(values);

    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, msg]) => {
        this.showError(field, msg);
      });
      return;
    }

    if (typeof this.onSubmitCallback === "function") {
      try {
        this.setLoadingState(true, MESSAGES.SUBMITTING_LOGIN || "Sending OTP...");
        await this.onSubmitCallback(values);
      } catch (err) {
        this.showError("email", err.message || MESSAGES.FORGOT_PASSWORD_GENERIC_ERROR);
      } finally {
        this.setLoadingState(false);
      }
    }
  }
}
