const mongoose = require('mongoose');

/**
 * Document Version Sub-schema
 */
const DocumentVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Document Management Schema
 */
const DocumentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Document must be associated with a project'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    filePath: {
      type: String,
      required: [true, 'File path or URL is required'],
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        'Contract',
        'Proposal',
        'Report',
        'Ethics',
        'Financial',
        'Data',
        'Other',
      ],
      default: 'Report',
    },
    versionNumber: {
      type: Number,
      default: 1,
    },
    versionHistory: [DocumentVersionSchema],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Document', DocumentSchema);
