const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Publication = require('../models/Publication');
const Document = require('../models/Document');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Get dashboard analytics statistics payload for charts & KPIs
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // 1. Projects Statistics
  const totalProjects = await Project.countDocuments();
  const activeProjects = await Project.countDocuments({ status: 'Active' });
  const completedProjects = await Project.countDocuments({ status: 'Completed' });
  const planningProjects = await Project.countDocuments({ status: 'Planning' });
  const onHoldProjects = await Project.countDocuments({ status: 'On Hold' });

  // 2. Reports / Milestones Statistics across all projects
  const reportAgg = await Project.aggregate([
    {
      $project: {
        reportItems: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$reports', []] } }, 0] },
            then: '$reports',
            else: { $ifNull: ['$milestones', []] },
          },
        },
      },
    },
    { $unwind: '$reportItems' },
    {
      $group: {
        _id: '$reportItems.status',
        count: { $sum: 1 },
      },
    },
  ]);

  let totalReports = 0;
  let completedReports = 0;
  let inProgressReports = 0;
  let pendingReports = 0;

  reportAgg.forEach((item) => {
    totalReports += item.count;
    if (item._id === 'Completed') completedReports = item.count;
    if (item._id === 'In Progress') inProgressReports = item.count;
    if (item._id === 'Pending') pendingReports = item.count;
  });

  const reportCompletionRate =
    totalReports > 0 ? ((completedReports / totalReports) * 100).toFixed(2) : 0;

  // 3. Financial & Budget Aggregation
  const budgetAgg = await Project.aggregate([
    {
      $group: {
        _id: null,
        totalBudget: { $sum: '$budget' },
      },
    },
  ]);
  const overallBudget = budgetAgg.length > 0 ? budgetAgg[0].totalBudget : 0;

  const expenseAgg = await Expense.aggregate([
    { $match: { status: 'Approved' } },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);
  const overallSpent = expenseAgg.length > 0 ? expenseAgg[0].totalSpent : 0;
  const budgetUtilizationPercentage =
    overallBudget > 0 ? ((overallSpent / overallBudget) * 100).toFixed(2) : 0;

  // 4. Research Outputs Statistics
  const totalOutputs = await Publication.countDocuments();
  const outputBreakdownAgg = await Publication.aggregate([
    {
      $group: {
        _id: '$outputType',
        count: { $sum: 1 },
      },
    },
  ]);
  const outputBreakdown = {};
  outputBreakdownAgg.forEach((item) => {
    outputBreakdown[item._id] = item.count;
  });

  // 5. Total Uploaded Documents
  const totalDocuments = await Document.countDocuments();

  // 6. Project Chart Analytics (Budget vs. Actual Spent per project)
  const chartProjects = await Project.find()
    .select('title budget')
    .limit(10)
    .sort({ createdAt: -1 });

  const chartProjectData = await Promise.all(
    chartProjects.map(async (p) => {
      const projectExpenseAgg = await Expense.aggregate([
        { $match: { project: p._id, status: 'Approved' } },
        {
          $group: {
            _id: null,
            spent: { $sum: '$amount' },
          },
        },
      ]);
      const spent = projectExpenseAgg.length > 0 ? projectExpenseAgg[0].spent : 0;

      return {
        id: p._id,
        title: p.title,
        budget: p.budget,
        spent,
      };
    })
  );

  const reportsPayload = {
    total: totalReports,
    completed: completedReports,
    inProgress: inProgressReports,
    pending: pendingReports,
    completionRate: parseFloat(reportCompletionRate),
  };

  res.status(200).json({
    success: true,
    data: {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        planning: planningProjects,
        onHold: onHoldProjects,
      },
      reports: reportsPayload,
      milestones: reportsPayload,
      finances: {
        overallBudget,
        overallSpent,
        remainingBudget: overallBudget - overallSpent,
        utilizationPercentage: parseFloat(budgetUtilizationPercentage),
      },
      outputs: {
        total: totalOutputs,
        breakdown: outputBreakdown,
      },
      documents: {
        total: totalDocuments,
      },
      chartProjectData,
    },
  });
});

module.exports = {
  getDashboardStats,
};
