const express = require('express');
const router = express.Router();
const {
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
  addMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All project routes require JWT authentication
router.use(protect);

// Project CRUD
router
  .route('/')
  .get(getProjects)
  .post(authorize('Admin', 'Manager'), createProject);

router
  .route('/:id')
  .get(getProjectById)
  .put(authorize('Admin', 'Manager', 'Researcher'), updateProject)
  .delete(authorize('Admin'), deleteProject);

// Team Member Management
router
  .route('/:id/members')
  .post(authorize('Admin', 'Manager'), addTeamMember);

router
  .route('/:id/members/:userId')
  .delete(authorize('Admin', 'Manager'), removeTeamMember);

// Reports Management (with optional file upload)
router
  .route('/:id/reports')
  .post(authorize('Admin', 'Manager', 'Researcher'), upload.single('file'), addReport);

router
  .route('/:id/reports/:reportId')
  .put(authorize('Admin', 'Manager', 'Researcher'), upload.single('file'), updateReport)
  .delete(authorize('Admin', 'Manager'), deleteReport);

// Milestones Management (backward compatibility aliases)
router
  .route('/:id/milestones')
  .post(authorize('Admin', 'Manager', 'Researcher'), upload.single('file'), addMilestone);

router
  .route('/:id/milestones/:milestoneId')
  .put(authorize('Admin', 'Manager', 'Researcher'), upload.single('file'), updateMilestone)
  .delete(authorize('Admin', 'Manager'), deleteMilestone);

module.exports = router;
