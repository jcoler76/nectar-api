try {
  require('ts-node').register({ transpileOnly: true });
} catch (e) {
  // ignore
}
module.exports = require('./transform.ts');
