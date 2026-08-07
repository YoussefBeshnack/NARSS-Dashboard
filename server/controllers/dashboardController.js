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

  // 2. Milestones Statistics across all projects
  const milestoneAgg = await Project.aggregate([
    { $unwind: '$milestones' },
    {
      $group: {
        _id: '$milestones.status',
        count: { $sum: 1 },
      },
    },
  ]);

  let totalMilestones = 0;
  let completedMilestones = 0;
  let inProgressMilestones = 0;
  let pendingMilestones = 0;

  milestoneAgg.forEach((item) => {
    totalMilestones += item.count;
    if (item._id === 'Completed') completedMilestones = item.count;
    if (item._id === 'In Progress') inProgressMilestones = item.count;
    if (item._id === 'Pending') pendingMilestones = item.count;
  });

  const milestoneCompletionRate =
    totalMilestones > 0 ? ((completedMilestones / totalMilestones) * 100).toFixed(2) : 0;

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

  // 4. Research Outputs Breakdown
  const outputsAgg = await Publication.aggregate([
    {
      $group: {
        _id: '$outputType',
        count: { $sum: 1 },
      },
    },
  ]);

  const outputBreakdown = {};
  outputsAgg.forEach((item) => {
    outputBreakdown[item._id] = item.count;
  });
  const totalOutputs = await Publication.countDocuments();

  // 5. Total Documents Count
  const totalDocuments = await Document.countDocuments();

  // 6. Project-wise Budget vs Spent (Top 5 for chart visual)
  const projects = await Project.find().select('title budget status').limit(5);
  const chartProjectData = await Promise.all(
    projects.map(async (p) => {
      const pExpense = await Expense.aggregate([
        { $match: { project: p._id, status: 'Approved' } },
        { $group: { _id: null, spent: { $sum: '$amount' } } },
      ]);
      const spent = pExpense.length > 0 ? pExpense[0].spent : 0;
      return {
        id: p._id,
        title: p.title,
        budget: p.budget,
        spent: spent,
        utilizationPercentage: p.budget > 0 ? ((spent / p.budget) * 100).toFixed(1) : 0,
      };
    })
  );

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
      milestones: {
        total: totalMilestones,
        completed: completedMilestones,
        inProgress: inProgressMilestones,
        pending: pendingMilestones,
        completionRate: parseFloat(milestoneCompletionRate),
      },
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
