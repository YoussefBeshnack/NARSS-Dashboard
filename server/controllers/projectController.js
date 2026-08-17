const Project = require('../models/Project');
const User = require('../models/User');
const Document = require('../models/Document');
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
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role')
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
    .populate('teamMembers.user', 'name email role')
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role');

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
    reports: req.body.reports || req.body.milestones || [],
    milestones: req.body.reports || req.body.milestones || [],
  });

  const populatedProject = await Project.findById(project._id)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role')
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role');

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

  // Check authorization: Admin, Manager, or PI of the project
  if (
    req.user.role !== 'Admin' &&
    req.user.role !== 'Manager' &&
    project.pi.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to update this project');
  }

  const { error } = validateProjectInput(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role')
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role');

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    project,
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin only)
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
  const userId = req.body.user || req.body.userId;
  const role = req.body.role;

  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Check if member already exists
  const isExisting = project.teamMembers.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (isExisting) {
    res.status(400);
    throw new Error('User is already a member of this project');
  }

  // Verify user exists in database
  const userExists = await User.findById(userId);
  if (!userExists) {
    res.status(404);
    throw new Error('User not found in system');
  }

  project.teamMembers.push({
    user: userId,
    role: role || 'Researcher',
  });

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('pi', 'name email role')
    .populate('teamMembers.user', 'name email role');

  res.status(200).json({
    success: true,
    message: 'Team member added successfully',
    teamMembers: populatedProject.teamMembers,
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
 * @desc    Add report / milestone to project
 * @route   POST /api/projects/:id/reports, POST /api/projects/:id/milestones
 * @access  Private (Admin, Manager, PI, Team Members)
 */
const addReport = asyncHandler(async (req, res) => {
  const { title, deadline, status, reportType } = req.body;

  if (!title || !deadline) {
    res.status(400);
    throw new Error('Report title and deadline date are required');
  }

  const validTypes = ['Final', 'Semi-Final', 'Periodic'];
  const chosenType = reportType && validTypes.includes(reportType) ? reportType : 'Periodic';

  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  let filePath, fileName, fileSize, documentId;

  if (req.file) {
    filePath = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;

    // Create a corresponding Document in the document repository
    try {
      const doc = await Document.create({
        project: project._id,
        fileName: req.file.originalname,
        filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        category: 'Report',
        versionNumber: 1,
        versionHistory: [
          {
            versionNumber: 1,
            filePath,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
          },
        ],
        uploadedBy: req.user._id,
      });
      documentId = doc._id;
    } catch (docErr) {
      console.error('Error auto-creating document for report:', docErr);
    }
  }

  const newReport = {
    title,
    reportType: chosenType,
    deadline,
    status: status || 'Pending',
    completedAt: status === 'Completed' ? new Date() : null,
    filePath,
    fileName,
    fileSize,
    documentId,
    uploadedBy: req.user._id,
  };

  if (!project.reports) project.reports = [];
  project.reports.push(newReport);

  if (!project.milestones) project.milestones = [];
  project.milestones.push(newReport);

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role');

  const savedReport = populatedProject.reports[populatedProject.reports.length - 1];

  res.status(201).json({
    success: true,
    message: 'Report added successfully',
    report: savedReport,
    reports: populatedProject.reports,
    milestones: populatedProject.milestones,
  });
});

/**
 * @desc    Update report / milestone status or details
 * @route   PUT /api/projects/:id/reports/:reportId, PUT /api/projects/:id/milestones/:milestoneId
 * @access  Private
 */
const updateReport = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const targetId = req.params.reportId || req.params.milestoneId;

  let report = project.reports ? project.reports.id(targetId) : null;
  if (!report && project.milestones) {
    report = project.milestones.id(targetId);
  }

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  if (req.body.title) report.title = req.body.title;
  if (req.body.deadline) report.deadline = req.body.deadline;
  if (req.body.reportType) report.reportType = req.body.reportType;
  if (req.body.status) {
    report.status = req.body.status;
    if (req.body.status === 'Completed' && !report.completedAt) {
      report.completedAt = new Date();
    }
  }

  // Handle uploaded file replacement or attachment
  if (req.file) {
    const filePath = `/uploads/${req.file.filename}`;
    report.filePath = filePath;
    report.fileName = req.file.originalname;
    report.fileSize = req.file.size;
    report.uploadedBy = req.user._id;

    try {
      if (report.documentId) {
        const existingDoc = await Document.findById(report.documentId);
        if (existingDoc) {
          const newVersionNumber = existingDoc.versionNumber + 1;
          existingDoc.versionHistory.push({
            versionNumber: newVersionNumber,
            filePath,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
          });
          existingDoc.versionNumber = newVersionNumber;
          existingDoc.filePath = filePath;
          existingDoc.fileName = req.file.originalname;
          existingDoc.fileSize = req.file.size;
          existingDoc.mimeType = req.file.mimetype;
          await existingDoc.save();
        }
      } else {
        const doc = await Document.create({
          project: project._id,
          fileName: req.file.originalname,
          filePath,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          category: 'Report',
          versionNumber: 1,
          versionHistory: [
            {
              versionNumber: 1,
              filePath,
              fileName: req.file.originalname,
              fileSize: req.file.size,
              uploadedBy: req.user._id,
              uploadedAt: new Date(),
            },
          ],
          uploadedBy: req.user._id,
        });
        report.documentId = doc._id;
      }
    } catch (docErr) {
      console.error('Error updating document record for report:', docErr);
    }
  }

  // Sync to milestones array if present
  const matchingMilestone = project.milestones ? project.milestones.id(targetId) : null;
  if (matchingMilestone && matchingMilestone !== report) {
    if (report.title) matchingMilestone.title = report.title;
    if (report.deadline) matchingMilestone.deadline = report.deadline;
    if (report.reportType) matchingMilestone.reportType = report.reportType;
    if (report.status) matchingMilestone.status = report.status;
    if (report.completedAt) matchingMilestone.completedAt = report.completedAt;
    if (report.filePath) matchingMilestone.filePath = report.filePath;
    if (report.fileName) matchingMilestone.fileName = report.fileName;
    if (report.fileSize) matchingMilestone.fileSize = report.fileSize;
    if (report.documentId) matchingMilestone.documentId = report.documentId;
    if (report.uploadedBy) matchingMilestone.uploadedBy = report.uploadedBy;
  }

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('reports.uploadedBy', 'name email role')
    .populate('milestones.uploadedBy', 'name email role');

  const updatedReport = (populatedProject.reports && populatedProject.reports.id(targetId)) ||
                        (populatedProject.milestones && populatedProject.milestones.id(targetId)) ||
                        report;

  res.status(200).json({
    success: true,
    message: 'Report updated successfully',
    report: updatedReport,
    milestone: updatedReport,
  });
});

/**
 * @desc    Delete report / milestone
 * @route   DELETE /api/projects/:id/reports/:reportId, DELETE /api/projects/:id/milestones/:milestoneId
 * @access  Private (Admin, Manager, PI)
 */
const deleteReport = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const targetId = req.params.reportId || req.params.milestoneId;

  if (project.reports) {
    project.reports = project.reports.filter(
      (r) => r._id.toString() !== targetId
    );
  }

  if (project.milestones) {
    project.milestones = project.milestones.filter(
      (m) => m._id.toString() !== targetId
    );
  }

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Report deleted successfully',
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
  addReport,
  updateReport,
  deleteReport,
  addMilestone: addReport,
  updateMilestone: updateReport,
  deleteMilestone: deleteReport,
};
