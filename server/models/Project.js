const mongoose = require('mongoose');

/**
 * Team Member Sub-schema
 */
const TeamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['Lead', 'Researcher', 'Advisor', 'Contributor'],
      default: 'Researcher',
    },
  },
  { _id: false }
);

/**
 * Milestone Sub-schema
 */
const MilestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide milestone title'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Please provide milestone deadline'],
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/**
 * Project Schema
 */
const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a project title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a project description'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please specify end date'],
    },
    budget: {
      type: Number,
      required: [true, 'Please specify project budget'],
      min: [0, 'Budget cannot be negative'],
    },
    pi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Principal Investigator (PI) is required'],
    },
    fundingSource: {
      type: String,
      trim: true,
      default: 'Internal Funding',
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    teamMembers: [TeamMemberSchema],
    milestones: [MilestoneSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', ProjectSchema);
