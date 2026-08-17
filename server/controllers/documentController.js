const Document = require('../models/Document');
const Project = require('../models/Project');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Search/Filter documents by keyword, date range, or category
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = asyncHandler(async (req, res) => {
  const { keyword, category, project, startDate, endDate } = req.query;

  const query = {};

  if (project) {
    query.project = project;
  }

  if (category) {
    query.category = category;
  }

  if (keyword) {
    query.fileName = { $regex: keyword, $options: 'i' };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const documents = await Document.find(query)
    .populate('project', 'title status')
    .populate('uploadedBy', 'name email role')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: documents.length,
    documents,
  });
});

/**
 * @desc    Get single document details & version history
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('project', 'title status')
    .populate('uploadedBy', 'name email role')
    .populate('versionHistory.uploadedBy', 'name email');

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  res.status(200).json({
    success: true,
    document,
  });
});

/**
 * @desc    Upload a new document (Initial Version 1)
 * @route   POST /api/documents
 * @access  Private
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please select a file to upload');
  }

  const { project, category } = req.body;

  if (!project) {
    res.status(400);
    throw new Error('Project ID is required');
  }

  const existingProject = await Project.findById(project);
  if (!existingProject) {
    res.status(404);
    throw new Error('Project not found');
  }

  const filePath = `/uploads/${req.file.filename}`;

  const document = await Document.create({
    project,
    fileName: req.file.originalname,
    filePath,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    category: category || 'Report',
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

  const populatedDoc = await Document.findById(document._id)
    .populate('project', 'title')
    .populate('uploadedBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    document: populatedDoc,
  });
});

/**
 * @desc    Upload a new version of an existing document
 * @route   POST /api/documents/:id/versions
 * @access  Private
 */
const uploadNewVersion = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file for the new version');
  }

  const document = await Document.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  const newVersionNumber = document.versionNumber + 1;
  const newFilePath = `/uploads/${req.file.filename}`;

  // Store current version in history before updating main fields
  document.versionHistory.push({
    versionNumber: newVersionNumber,
    filePath: newFilePath,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  });

  document.versionNumber = newVersionNumber;
  document.filePath = newFilePath;
  document.fileName = req.file.originalname;
  document.fileSize = req.file.size;
  document.mimeType = req.file.mimetype;
  document.uploadedBy = req.user._id;

  await document.save();

  res.status(200).json({
    success: true,
    message: `Document updated to Version ${newVersionNumber}`,
    document,
  });
});

/**
 * @desc    Revert document to a specific previous version
 * @route   POST /api/documents/:id/revert/:versionNumber
 * @access  Private (Admin, Manager, UploadedBy)
 */
const revertDocumentVersion = asyncHandler(async (req, res) => {
  const targetVersion = parseInt(req.params.versionNumber, 10);
  const document = await Document.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  const selectedVersion = document.versionHistory.find(
    (v) => v.versionNumber === targetVersion
  );

  if (!selectedVersion) {
    res.status(404);
    throw new Error(`Version ${targetVersion} not found in document history`);
  }

  // Revert active document fields to target version
  document.filePath = selectedVersion.filePath;
  if (selectedVersion.fileName) document.fileName = selectedVersion.fileName;
  if (selectedVersion.fileSize) document.fileSize = selectedVersion.fileSize;
  document.versionNumber = targetVersion;

  await document.save();

  res.status(200).json({
    success: true,
    message: `Document reverted to Version ${targetVersion}`,
    document,
  });
});

/**
 * @desc    Delete a specific version from document version history
 * @route   DELETE /api/documents/:id/versions/:versionNumber
 * @access  Private (Admin, Manager)
 */
const deleteDocumentVersion = asyncHandler(async (req, res) => {
  const targetVersion = parseInt(req.params.versionNumber, 10);
  const document = await Document.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  // Cannot delete the active version — use revert or delete document instead
  if (targetVersion === document.versionNumber) {
    res.status(400);
    throw new Error(
      'Cannot delete the currently active version. Revert to another version first, or delete the entire document.'
    );
  }

  const versionIndex = document.versionHistory.findIndex(
    (v) => v.versionNumber === targetVersion
  );

  if (versionIndex === -1) {
    res.status(404);
    throw new Error(`Version ${targetVersion} not found in document history`);
  }

  document.versionHistory.splice(versionIndex, 1);
  await document.save();

  res.status(200).json({
    success: true,
    message: `Version ${targetVersion} deleted from document history`,
    document,
  });
});

/**
 * @desc    Delete document and all its versions
 * @route   DELETE /api/documents/:id
 * @access  Private (Admin, Manager)
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    res.status(404);
    throw new Error('Document not found');
  }

  await document.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
  });
});

module.exports = {
  getDocuments,
  getDocumentById,
  uploadDocument,
  uploadNewVersion,
  revertDocumentVersion,
  deleteDocumentVersion,
  deleteDocument,
};
