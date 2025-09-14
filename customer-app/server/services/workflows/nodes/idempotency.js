try {
  require('ts-node').register({ transpileOnly: true });
} catch (e) {}
module.exports = require('./idempotency.ts');
