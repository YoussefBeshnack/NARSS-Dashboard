import { SELECTORS, DATA_ATTRS } from '../core/constants.js';

export class BaseFormHandler {
  /**
   * @param {Object} config
   * @param {string|HTMLFormElement} config.form - Form element or CSS selector
   * @param {Function} config.onSubmit - Async callback triggered on valid submission
   */
  constructor({ form, onSubmit }) {
    this.form = typeof form === 'string' ? document.querySelector(form) : form;
    if (!this.form) {
      throw new Error(`${this.constructor.name}: Form element not found.`);
    }

    this.onSubmitCallback = onSubmit;
    this.initBase();
  }

  /**
   * Base initialization: disables native validation and sets up submit event
   */
  initBase() {
    this.form.setAttribute('novalidate', 'true');
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /**
   * Collects current input values mapped by name attribute
   * @returns {Object} Key-value map of form fields
   */
  getValues() {
    const formData = new FormData(this.form);
    const values = {};
    for (const [key, value] of formData.entries()) {
      values[key] = typeof value === 'string' ? value.trim() : value;
    }
    return values;
  }

  /**
   * Shows error message below the target input field
   */
  showError(fieldName, message) {
    const input = this.form.querySelector(`[name="${fieldName}"]`);
    if (!input) return;

    input.classList.add(SELECTORS.INVALID_INPUT_CLASS);

    let errorEl = this.form.querySelector(`[${DATA_ATTRS.ERROR_FOR}="${fieldName}"]`);
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = SELECTORS.ERROR_ELEMENT_CLASS;
      errorEl.setAttribute(DATA_ATTRS.ERROR_FOR, fieldName);
      
      // Inject after input element
      input.parentNode.appendChild(errorEl);
    }

    errorEl.textContent = message;
  }

  /**
   * Clears error state and message for a specific field
   */
  clearError(fieldName) {
    const input = this.form.querySelector(`[name="${fieldName}"]`);
    if (input) input.classList.remove(SELECTORS.INVALID_INPUT_CLASS);

    const errorEl = this.form.querySelector(`[${DATA_ATTRS.ERROR_FOR}="${fieldName}"]`);
    if (errorEl) errorEl.textContent = '';
  }

  /**
   * Clears all error states across the form
   */
  clearAllErrors() {
    const inputs = this.form.querySelectorAll(`.${SELECTORS.INVALID_INPUT_CLASS}`);
    inputs.forEach((input) => input.classList.remove(SELECTORS.INVALID_INPUT_CLASS));

    const errors = this.form.querySelectorAll(`[${DATA_ATTRS.ERROR_FOR}]`);
    errors.forEach((el) => {
      el.textContent = '';
    });
  }

  /**
   * Toggles button pending state during async submission
   */
  setLoadingState(isLoading, loadingText = 'Processing...') {
    const submitBtn = this.form.querySelector(SELECTORS.SUBMIT_BUTTON);
    if (!submitBtn) return;

    submitBtn.disabled = isLoading;

    if (isLoading) {
      submitBtn.setAttribute(DATA_ATTRS.ORIGINAL_TEXT, submitBtn.textContent);
      submitBtn.textContent = loadingText;
    } else {
      const originalText = submitBtn.getAttribute(DATA_ATTRS.ORIGINAL_TEXT);
      if (originalText) submitBtn.textContent = originalText;
    }
  }

  /**
   * Primary submit template method (Overridden or extended by subclasses)
   */
  async handleSubmit(event) {
    event.preventDefault();
  }
}