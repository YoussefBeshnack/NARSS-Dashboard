import { BaseFormHandler } from './base-form.js';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateSignupForm,
} from '../core/validator.js';
import { MESSAGES } from '../core/constants.js';

export class SignupFormHandler extends BaseFormHandler {
  constructor(config) {
    super(config);
    this.initFields();
  }

  initFields() {
    const fields = ['fullName', 'email', 'password', 'confirmPassword'];

    fields.forEach((fieldName) => {
      const input = this.form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;

      input.addEventListener('blur', () => this.validateField(fieldName));
      input.addEventListener('input', () => {
        this.clearError(fieldName);

        // Recheck match if main password input is modified
        if (fieldName === 'password') {
          const confirmInput = this.form.querySelector('[name="confirmPassword"]');
          if (confirmInput && confirmInput.value) {
            this.validateField('confirmPassword');
          }
        }
      });
    });
  }

  validateField(fieldName) {
    const values = this.getValues();
    let result = { isValid: true, message: '' };

    if (fieldName === 'fullName') result = validateName(values.fullName);
    if (fieldName === 'email') result = validateEmail(values.email);
    if (fieldName === 'password') result = validatePassword(values.password);
    if (fieldName === 'confirmPassword') {
      result = validateConfirmPassword(values.password, values.confirmPassword);
    }

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
    const validation = validateSignupForm(values);

    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, msg]) => {
        this.showError(field, msg);
      });
      return;
    }

    if (typeof this.onSubmitCallback === 'function') {
      try {
        this.setLoadingState(true, MESSAGES.SUBMITTING_SIGNUP || 'Creating account...');
        await this.onSubmitCallback(values);
      } catch (err) {
        this.showError('confirmPassword', err.message || MESSAGES.SIGNUP_GENERIC_ERROR);
      } finally {
        this.setLoadingState(false);
      }
    }
  }
}