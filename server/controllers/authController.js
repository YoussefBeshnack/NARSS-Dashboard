const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { validateRegisterInput, validateLoginInput } = require('../utils/validators');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Register a new user (supports both /register and /signup endpoints)
 * @route   POST /api/auth/register or /api/auth/signup
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  // Support both name/fullName and role inputs
  const payload = {
    name: req.body.name || req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'Researcher',
  };

  const { error } = validateRegisterInput(payload);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Check if user already exists
  const userExists = await User.findOne({ email: payload.email.toLowerCase() });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email address');
  }

  // Create user
  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    role: payload.role,
  });

  const token = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Authenticate user & get JWT tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { error } = validateLoginInput(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email, password } = req.body;

  // Find user and include password field for matching
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Refresh JWT Access Token using Refresh Token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    throw new Error('Refresh token is required');
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_narss_2026_change_in_production';
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }
});

/**
 * @desc    Forgot Password - Issue Reset Token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return success to avoid email enumeration
    return res.status(200).json({
      success: true,
      message: 'If that email address is registered, a password reset token has been issued.',
    });
  }

  // Generate unhashed reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash reset token and store in document
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration (10 minutes)
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Password reset token generated successfully',
    resetToken, // In production, send via email. Returned here for testability.
  });
});

/**
 * @desc    Reset Password using Reset Token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    res.status(400);
    throw new Error('Reset token and new password are required');
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. You may now log in with your new password.',
  });
});

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getMe,
};
