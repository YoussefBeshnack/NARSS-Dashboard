const Joi = require('joi');

/**
 * Register Input Validation Schema
 */
const validateRegisterInput = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(64).required(),
    role: Joi.string().valid('Admin', 'Manager', 'Researcher', 'External Partner'),
  });
  return schema.validate(data);
};

/**
 * Login Input Validation Schema
 */
const validateLoginInput = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return schema.validate(data);
};

/**
 * Project Input Validation Schema
 */
const validateProjectInput = (data) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    budget: Joi.number().min(0).required(),
    pi: Joi.string().hex().length(24),
    fundingSource: Joi.string().allow(''),
    status: Joi.string().valid('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'),
  });
  return schema.validate(data);
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateProjectInput,
};
