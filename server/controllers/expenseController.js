const Expense = require('../models/Expense');
const Project = require('../models/Project');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Get all expenses (filterable by project, category, status)
 * @route   GET /api/expenses
 * @access  Private
 */
const getExpenses = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.project) {
    query.project = req.query.project;
  }

  if (req.query.category) {
    query.category = req.query.category;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  const expenses = await Expense.find(query)
    .populate('project', 'title budget status')
    .populate('createdBy', 'name email role')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: expenses.length,
    expenses,
  });
});

/**
 * @desc    Get expense by ID
 * @route   GET /api/expenses/:id
 * @access  Private
 */
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('project', 'title budget status')
    .populate('createdBy', 'name email role');

  if (!expense) {
    res.status(404);
    throw new Error('Expense record not found');
  }

  res.status(200).json({
    success: true,
    expense,
  });
});

/**
 * @desc    Create new expense log with optional receipt file attachment
 * @route   POST /api/expenses
 * @access  Private
 */
const createExpense = asyncHandler(async (req, res) => {
  const { project, category, amount, date, description } = req.body;

  if (!project || !category || !amount) {
    res.status(400);
    throw new Error('Project ID, category, and amount are required');
  }

  // Verify project existence
  const existingProject = await Project.findById(project);
  if (!existingProject) {
    res.status(404);
    throw new Error('Project not found');
  }

  let receiptUrl = null;
  let receiptName = null;

  if (req.file) {
    receiptUrl = `/uploads/${req.file.filename}`;
    receiptName = req.file.originalname;
  }

  const expense = await Expense.create({
    project,
    category,
    amount: parseFloat(amount),
    date: date || new Date(),
    description,
    receiptUrl,
    receiptName,
    status: req.body.status || 'Pending',
    createdBy: req.user._id,
  });

  const populatedExpense = await Expense.findById(expense._id)
    .populate('project', 'title budget')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Expense logged successfully',
    expense: populatedExpense,
  });
});

/**
 * @desc    Update expense log status or details
 * @route   PUT /api/expenses/:id
 * @access  Private (Admin, Manager, Creator)
 */
const updateExpense = asyncHandler(async (req, res) => {
  let expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense log not found');
  }

  // File upload update
  if (req.file) {
    req.body.receiptUrl = `/uploads/${req.file.filename}`;
    req.body.receiptName = req.file.originalname;
  }

  expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('project', 'title budget')
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    expense,
  });
});

/**
 * @desc    Delete expense log
 * @route   DELETE /api/expenses/:id
 * @access  Private (Admin, Manager)
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense log not found');
  }

  await expense.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Expense log deleted successfully',
  });
});

/**
 * @desc    Get aggregated financial summary report (budget vs spent per project or total)
 * @route   GET /api/expenses/summary
 * @access  Private
 */
const getFinancialSummary = asyncHandler(async (req, res) => {
  const { projectId } = req.query;

  let projectFilter = {};
  if (projectId) {
    projectFilter = { _id: projectId };
  }

  const projects = await Project.find(projectFilter).select('title budget status');

  const summary = await Promise.all(
    projects.map(async (p) => {
      const expenseStats = await Expense.aggregate([
        { $match: { project: p._id } },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      let totalApproved = 0;
      let totalPending = 0;
      let totalRejected = 0;

      expenseStats.forEach((stat) => {
        if (stat._id === 'Approved') totalApproved = stat.totalAmount;
        if (stat._id === 'Pending') totalPending = stat.totalAmount;
        if (stat._id === 'Rejected') totalRejected = stat.totalAmount;
      });

      const totalSpent = totalApproved;
      const remainingBudget = p.budget - totalSpent;
      const utilizationPercentage = p.budget > 0 ? ((totalSpent / p.budget) * 100).toFixed(2) : 0;

      // Category breakdown
      const categoryBreakdown = await Expense.aggregate([
        { $match: { project: p._id, status: 'Approved' } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
          },
        },
      ]);

      return {
        projectId: p._id,
        projectTitle: p.title,
        status: p.status,
        allocatedBudget: p.budget,
        totalSpent,
        totalPending,
        totalRejected,
        remainingBudget,
        utilizationPercentage: parseFloat(utilizationPercentage),
        categoryBreakdown,
      };
    })
  );

  res.status(200).json({
    success: true,
    summary,
  });
});

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getFinancialSummary,
};
