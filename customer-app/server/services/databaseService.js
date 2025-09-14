// Legacy Database Service - Backwards compatibility wrapper
const DatabaseService = require('./database/DatabaseService');

// Re-export the new DatabaseService for backwards compatibility
module.exports = DatabaseService;
