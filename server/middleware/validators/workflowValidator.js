const { body } = require('express-validator');

exports.validateWorkflow = [
  body('name').not().isEmpty().withMessage('Workflow name is required.'),
  body('nodes').isArray().withMessage('Nodes must be an array.'),
  body('edges').isArray().withMessage('Edges must be an array.'),
];
