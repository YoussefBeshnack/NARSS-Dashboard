const Publication = require('../models/Publication');
const Project = require('../models/Project');
const { asyncHandler } = require('../middlewares/errorMiddleware');

/**
 * @desc    Get all research outputs / publications with search & filters
 * @route   GET /api/publications
 * @access  Private
 */
const getPublications = asyncHandler(async (req, res) => {
  const { project, outputType, search, status } = req.query;

  const query = {};

  if (project) query.project = project;
  if (outputType) query.outputType = outputType;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { authors: { $regex: search, $options: 'i' } },
      { journalOrPublisher: { $regex: search, $options: 'i' } },
    ];
  }

  const publications = await Publication.find(query)
    .populate('project', 'title status')
    .populate('createdBy', 'name email role')
    .sort({ publicationDate: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: publications.length,
    publications,
  });
});

/**
 * @desc    Get single publication output by ID
 * @route   GET /api/publications/:id
 * @access  Private
 */
const getPublicationById = asyncHandler(async (req, res) => {
  const publication = await Publication.findById(req.params.id)
    .populate('project', 'title status')
    .populate('createdBy', 'name email role');

  if (!publication) {
    res.status(404);
    throw new Error('Research output record not found');
  }

  res.status(200).json({
    success: true,
    publication,
  });
});

/**
 * @desc    Register a new research output / publication
 * @route   POST /api/publications
 * @access  Private
 */
const createPublication = asyncHandler(async (req, res) => {
  const {
    project,
    outputType,
    title,
    authors,
    externalIdentifiers,
    links,
    publicationDate,
    journalOrPublisher,
    status,
  } = req.body;

  if (!project || !outputType || !title) {
    res.status(400);
    throw new Error('Project ID, output type, and title are required');
  }

  const existingProject = await Project.findById(project);
  if (!existingProject) {
    res.status(404);
    throw new Error('Project not found');
  }

  const publication = await Publication.create({
    project,
    outputType,
    title,
    authors: Array.isArray(authors) ? authors : [authors].filter(Boolean),
    externalIdentifiers: externalIdentifiers || {},
    links: Array.isArray(links) ? links : [links].filter(Boolean),
    publicationDate: publicationDate || new Date(),
    journalOrPublisher,
    status: status || 'Published',
    createdBy: req.user._id,
  });

  const populatedPub = await Publication.findById(publication._id)
    .populate('project', 'title')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Research output registered successfully',
    publication: populatedPub,
  });
});

/**
 * @desc    Update research output details
 * @route   PUT /api/publications/:id
 * @access  Private (Admin, Manager, Creator)
 */
const updatePublication = asyncHandler(async (req, res) => {
  let publication = await Publication.findById(req.params.id);

  if (!publication) {
    res.status(404);
    throw new Error('Research output record not found');
  }

  publication = await Publication.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('project', 'title')
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Research output updated successfully',
    publication,
  });
});

/**
 * @desc    Delete research output
 * @route   DELETE /api/publications/:id
 * @access  Private (Admin, Manager, Creator)
 */
const deletePublication = asyncHandler(async (req, res) => {
  const publication = await Publication.findById(req.params.id);

  if (!publication) {
    res.status(404);
    throw new Error('Research output record not found');
  }

  await publication.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Research output deleted successfully',
  });
});

/**
 * @desc    Export publications list in CSV format
 * @route   GET /api/publications/export/csv
 * @access  Private
 */
const exportPublicationsCSV = asyncHandler(async (req, res) => {
  const publications = await Publication.find()
    .populate('project', 'title')
    .sort({ createdAt: -1 });

  // Format CSV headers and lines
  const headers = ['ID', 'Title', 'Output Type', 'Project', 'Authors', 'Journal/Publisher', 'Publication Date', 'DOI', 'Status'];
  
  const csvRows = [headers.join(',')];

  publications.forEach((pub) => {
    const authorsStr = (pub.authors || []).join('; ');
    const projectTitle = pub.project ? pub.project.title : 'N/A';
    const pubDate = pub.publicationDate ? new Date(pub.publicationDate).toISOString().split('T')[0] : '';
    const doi = pub.externalIdentifiers ? pub.externalIdentifiers.doi || '' : '';

    const row = [
      `"${pub._id}"`,
      `"${(pub.title || '').replace(/"/g, '""')}"`,
      `"${pub.outputType}"`,
      `"${(projectTitle).replace(/"/g, '""')}"`,
      `"${authorsStr.replace(/"/g, '""')}"`,
      `"${(pub.journalOrPublisher || '').replace(/"/g, '""')}"`,
      `"${pubDate}"`,
      `"${doi}"`,
      `"${pub.status}"`,
    ];

    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="research_outputs_export.csv"');
  res.status(200).send(csvContent);
});

module.exports = {
  getPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  exportPublicationsCSV,
};
