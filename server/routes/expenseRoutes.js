const express = require('express');
const router = express.Router();
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getFinancialSummary,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All expense routes require authentication
router.use(protect);

// Financial summary report route
router.get('/summary', getFinancialSummary);

// Expense CRUD & optional receipt upload
router
  .route('/')
  .get(getExpenses)
  .post(upload.single('receipt'), createExpense);

router
  .route('/:id')
  .get(getExpenseById)
  .put(upload.single('receipt'), updateExpense)
  .delete(authorize('Admin', 'Manager'), deleteExpense);

module.exports = router;
