const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  uploadDocument,
  uploadNewVersion,
  revertDocumentVersion,
  deleteDocumentVersion,
  deleteDocument,
} = require('../controllers/documentController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All document routes require authentication
router.use(protect);

router
  .route('/')
  .get(getDocuments)
  .post(upload.single('file'), uploadDocument);

router
  .route('/:id')
  .get(getDocumentById)
  .delete(authorize('Admin', 'Manager'), deleteDocument);

// Document Versioning routes
router.post('/:id/versions', upload.single('file'), uploadNewVersion);
router.post('/:id/revert/:versionNumber', revertDocumentVersion);
router.delete('/:id/versions/:versionNumber', authorize('Admin', 'Manager'), deleteDocumentVersion);

module.exports = router;


