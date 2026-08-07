const Project = require('../models/Project');
const User = require('../models/User');
const { validateProjectInput } = require('../utils/validators');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Get all projects (With role filtering: Researchers only see assigned/PI projects unless Admin/Manager)
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = asyncHandler(async (req, res) => {
  let query = {};

  // If user is Researcher or External Partner, filter by assigned PI or team member
  if (['Researcher', 'External Partner'].includes(req.user.role)) {
    query = {
      $or: [
        { pi: req.user._id },
        { 'teamMembers.user': req.user._id },
      ],
    };
  }

  // Filter by status if provided in query params
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by search keyword
  if (req.query.search) {
    query.title = { $regex: req.query.search, $options: 'i' };
  }

  const projects = await Project.find(query)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: projects.length,
    projects,
  });
});

/**
 * @desc    Get single project details
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role');

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Check access permission for Researcher/External Partner
  if (['Researcher', 'External Partner'].includes(req.user.role)) {
    const isPI = project.pi._id.toString() === req.user._id.toString();
    const isMember = project.teamMembers.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    if (!isPI && !isMember) {
      res.status(403);
      throw new Error('Not authorized to access this project');
    }
  }

  res.status(200).json({
    success: true,
    project,
  });
});

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Admin, Manager)
 */
const createProject = asyncHandler(async (req, res) => {
  const { error } = validateProjectInput(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const piId = req.body.pi || req.user._id;

  const project = await Project.create({
    title: req.body.title,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    budget: req.body.budget,
    pi: piId,
    fundingSource: req.body.fundingSource || 'Internal Funding',
    status: req.body.status || 'Planning',
    teamMembers: req.body.teamMembers || [],
    milestones: req.body.milestones || [],
  });

  const populatedProject = await Project.findById(project._id)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role');

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    project: populatedProject,
  });
});

/**
 * @desc    Update project details
 * @route   PUT /api/projects/:id
 * @access  Private (Admin, Manager, PI)
 */
const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Allow only Admin, Manager, or PI to update
  if (
    !['Admin', 'Manager'].includes(req.user.role) &&
    project.pi.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to update project');
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role');

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    project,
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin)
 */
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  await project.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
  });
});

/**
 * @desc    Add team member to project
 * @route   POST /api/projects/:id/members
 * @access  Private (Admin, Manager, PI)
 */
const addTeamMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Check user existence
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    res.status(404);
    throw new Error('User to add not found');
  }

  // Check if user is already a member
  const isExisting = project.teamMembers.some(
    (member) => member.user.toString() === userId
  );

  if (isExisting) {
    res.status(400);
    throw new Error('User is already a team member of this project');
  }

  project.teamMembers.push({
    user: userId,
    role: role || 'Researcher',
  });

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role');

  res.status(200).json({
    success: true,
    message: 'Team member added successfully',
    teamMembers: updatedProject.teamMembers,
  });
});

/**
 * @desc    Remove team member from project
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private (Admin, Manager, PI)
 */
const removeTeamMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.teamMembers = project.teamMembers.filter(
    (member) => member.user.toString() !== req.params.userId
  );

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Team member removed successfully',
    teamMembers: project.teamMembers,
  });
});

/**
 * @desc    Add milestone to project
 * @route   POST /api/projects/:id/milestones
 * @access  Private (Admin, Manager, PI)
 */
const addMilestone = asyncHandler(async (req, res) => {
  const { title, deadline, status } = req.body;

  if (!title || !deadline) {
    res.status(400);
    throw new Error('Milestone title and deadline are required');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const newMilestone = {
    title,
    deadline,
    status: status || 'Pending',
    completedAt: status === 'Completed' ? new Date() : null,
  };

  project.milestones.push(newMilestone);
  await project.save();

  res.status(201).json({
    success: true,
    message: 'Milestone added successfully',
    milestones: project.milestones,
  });
});

/**
 * @desc    Update milestone status or details
 * @route   PUT /api/projects/:id/milestones/:milestoneId
 * @access  Private
 */
const updateMilestone = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const milestone = project.milestones.id(req.params.milestoneId);

  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }

  if (req.body.title) milestone.title = req.body.title;
  if (req.body.deadline) milestone.deadline = req.body.deadline;
  if (req.body.status) {
    milestone.status = req.body.status;
    if (req.body.status === 'Completed' && !milestone.completedAt) {
      milestone.completedAt = new Date();
    }
  }

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Milestone updated successfully',
    milestone,
  });
});

/**
 * @desc    Delete milestone
 * @route   DELETE /api/projects/:id/milestones/:milestoneId
 * @access  Private (Admin, Manager, PI)
 */
const deleteMilestone = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.milestones = project.milestones.filter(
    (m) => m._id.toString() !== req.params.milestoneId
  );

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Milestone deleted successfully',
  });
});

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  addMilestone,
  updateMilestone,
  deleteMilestone,
};
