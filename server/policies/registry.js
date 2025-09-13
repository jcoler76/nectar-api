const { authMiddleware, adminOnly } = require('../middleware/auth');

// Wrap existing middlewares as named policies
const policies = {
  auth: authMiddleware,
  adminOnly: adminOnly,
};

const getPolicy = name => {
  if (!policies[name]) throw new Error(`Unknown policy: ${name}`);
  return policies[name];
};

module.exports = { getPolicy };
