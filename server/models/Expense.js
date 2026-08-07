const mongoose = require('mongoose');

/**
 * Expense & Budget Tracking Schema
 */
const ExpenseSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Expense must be linked to a project'],
    },
    category: {
      type: String,
      enum: [
        'Personnel',
        'Equipment',
        'Travel',
        'Subcontracting',
        'Supplies',
        'Overhead',
        'Other',
      ],
      required: [true, 'Expense category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Expense amount must be non-negative'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    receiptName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
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

module.exports = mongoose.model('Expense', ExpenseSchema);
