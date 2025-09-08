// Proxy to existing generated client to avoid regeneration during consolidation
// This allows both server and admin-backend to import from a shared path.
module.exports = require('../../../admin-backend/prisma/generated/client')

