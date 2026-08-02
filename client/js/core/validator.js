import { REGEX, CONSTRAINTS, MESSAGES } from './constants.js';

export const validateName = (name) => {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    return { isValid: false, message: MESSAGES.NAME_REQUIRED };
  }
  if (trimmed.length < CONSTRAINTS.NAME_MIN_LENGTH) {
    return { isValid: false, message: MESSAGES.NAME_TOO_SHORT };
  }
  return { isValid: true, message: '' };
};

export const validateEmail = (email) => {
  const trimmed = email ? email.trim() : '';

  if (!trimmed) {
    return { isValid: false, message: MESSAGES.EMAIL_REQUIRED };
  }
  if (!REGEX.EMAIL.test(trimmed)) {
    return { isValid: false, message: MESSAGES.EMAIL_INVALID };
  }
  return { isValid: true, message: '' };
};

export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: MESSAGES.PASSWORD_REQUIRED };
  }
  if (password.length < CONSTRAINTS.PASSWORD_MIN_LENGTH) {
    return { isValid: false, message: MESSAGES.PASSWORD_TOO_SHORT };
  }
  return { isValid: true, message: '' };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, message: MESSAGES.CONFIRM_PASSWORD_REQUIRED };
  }
  if (password !== confirmPassword) {
    return { isValid: false, message: MESSAGES.PASSWORDS_DONT_MATCH };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates login payload
 */
export const validateLoginForm = ({ email, password }) => {
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  const errors = {};
  if (!emailResult.isValid) errors.email = emailResult.message;
  if (!passwordResult.isValid) errors.password = passwordResult.message;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates signup payload
 */
export const validateSignupForm = ({ fullName, email, password, confirmPassword }) => {
  const nameResult = validateName(fullName);
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const confirmResult = validateConfirmPassword(password, confirmPassword);

  const errors = {};
  if (!nameResult.isValid) errors.fullName = nameResult.message;
  if (!emailResult.isValid) errors.email = emailResult.message;
  if (!passwordResult.isValid) errors.password = passwordResult.message;
  if (!confirmResult.isValid) errors.confirmPassword = confirmResult.message;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};