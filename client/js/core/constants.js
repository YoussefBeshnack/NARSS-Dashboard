/**
 * Application Navigation Routes
 */
export const ROUTES = {
  HOME: "/index.html",
  LOGIN: "/pages/login.html",
  SIGNUP: "/pages/signup.html",
  DASHBOARD: "/pages/dashboard.html",
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: "http://192.168.1.9:5000/api",
  SERVER_URL: "http://192.168.1.9:5000",
  ENDPOINTS: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    FORGOTPASSWORD: "/auth/forgot-password",
    REFRESH: "/auth/refresh",
  },
  TIMEOUT_MS: 10000,
};

/**
 * Validation Regex Patterns
 */
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Field Rules & Constraints
 */
export const CONSTRAINTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 64,
  NAME_MIN_LENGTH: 2,
};

/**
 * User-Facing Error & UI Messages
 */
export const MESSAGES = {
  NAME_REQUIRED: "Full name is required.",
  NAME_TOO_SHORT: `Name must be at least ${CONSTRAINTS.NAME_MIN_LENGTH} characters long.`,
  EMAIL_REQUIRED: "Email address is required.",
  EMAIL_INVALID: "Please enter a valid email address.",
  PASSWORD_REQUIRED: "Password is required.",
  PASSWORD_TOO_SHORT: `Password must be at least ${CONSTRAINTS.PASSWORD_MIN_LENGTH} characters long.`,
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your password.",
  PASSWORDS_DONT_MATCH: "Passwords do not match.",
  LOGIN_GENERIC_ERROR: "Invalid email or password. Please try again.",
  SIGNUP_GENERIC_ERROR: "An error occurred during signup. Please try again.",
  FORGOT_PASSWORD_GENERIC_ERROR: "An error occurred while sending the password reset request. Please try again.",
  NETWORK_ERROR: "Unable to connect to the server. Please check your connection.",
  SUBMITTING_SIGNUP: "Creating account...",
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "auth_user",
};

/**
 * DOM & CSS Target Selectors
 */
export const SELECTORS = {
  LOGIN_FORM: "#login-form",
  SIGNUP_FORM: "#signup-form",
  FORGOT_PASSWORD_FORM: "#forgot-password-form",
  NAME_INPUT: 'input[name="fullName"]',
  EMAIL_INPUT: 'input[name="email"]',
  PASSWORD_INPUT: 'input[name="password"]',
  CONFIRM_PASSWORD_INPUT: 'input[name="confirmPassword"]',
  SUBMIT_BUTTON: 'button[type="submit"]',
  ERROR_ELEMENT_CLASS: "error-message",
  INVALID_INPUT_CLASS: "is-invalid",
};

/**
 * Custom Data Attributes
 */
export const DATA_ATTRS = {
  ERROR_FOR: "data-error-for",
  ORIGINAL_TEXT: "data-original-text",
};
