const express = require('express');
const router = express.Router();
const {
  getPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  exportPublicationsCSV,
} = require('../controllers/publicationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All publication routes require authentication
router.use(protect);

// Export CSV utility route
router.get('/export/csv', exportPublicationsCSV);

// Publication CRUD
router
  .route('/')
  .get(getPublications)
  .post(createPublication);

router
  .route('/:id')
  .get(getPublicationById)
  .put(updatePublication)
  .delete(authorize('Admin', 'Manager'), deletePublication);

module.exports = router;
