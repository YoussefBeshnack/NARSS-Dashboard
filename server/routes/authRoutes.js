const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/signup', registerUser); // Alias for signup
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
