try {
  require('ts-node').register({ transpileOnly: true });
} catch (e) {
  // ts-node may already be registered by server.js; ignore errors
}
module.exports = require('./approval.ts');
