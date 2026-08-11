const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getMe,
  getUsers,
  updateUserRole,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/signup', registerUser); // Alias for signup
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.put('/users/:id', protect, authorize('Admin'), updateUserRole);

module.exports = router;
