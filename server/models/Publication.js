const mongoose = require('mongoose');

/**
 * Research Outputs & Publications Schema
 */
const PublicationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Research output must be associated with a project'],
    },
    outputType: {
      type: String,
      enum: [
        'Publication',
        'Patent',
        'Dataset',
        'Conference Paper',
        'Book Chapter',
        'Software',
      ],
      required: [true, 'Output type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    authors: [
      {
        type: String,
        trim: true,
      },
    ],
    externalIdentifiers: {
      doi: { type: String, trim: true, default: '' },
      scopusId: { type: String, trim: true, default: '' },
      orcid: { type: String, trim: true, default: '' },
      isbn: { type: String, trim: true, default: '' },
    },
    links: [
      {
        type: String,
        trim: true,
      },
    ],
    publicationDate: {
      type: Date,
    },
    journalOrPublisher: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Published', 'Granted'],
      default: 'Published',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Publication', PublicationSchema);
