const { getPolicy } = require('../policies/registry');
const policyMap = require('../policies/policyMap');

function applyPolicyGroup(groupName) {
  const chain = policyMap.groups[groupName] || [];
  const middlewares = chain.map(name => getPolicy(name));
  return function (req, res, next) {
    let idx = 0;
    const run = err => {
      if (err) return next(err);
      const mw = middlewares[idx++];
      if (!mw) return next();
      try {
        mw(req, res, run);
      } catch (e) {
        next(e);
      }
    };
    run();
  };
}

module.exports = { applyPolicyGroup };
