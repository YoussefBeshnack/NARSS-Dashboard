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
  addMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middlewares/authMiddleware');

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

// Milestones Management
router
  .route('/:id/milestones')
  .post(authorize('Admin', 'Manager', 'Researcher'), addMilestone);

router
  .route('/:id/milestones/:milestoneId')
  .put(updateMilestone)
  .delete(authorize('Admin', 'Manager'), deleteMilestone);

module.exports = router;
