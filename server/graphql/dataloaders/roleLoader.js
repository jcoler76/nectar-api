const DataLoader = require('dataloader');
const Role = require('../../models/Role');

const createRoleLoader = () => {
  return new DataLoader(async roleIds => {
    const roles = await Role.find({ _id: { $in: roleIds } });

    // Return roles in the same order as the input IDs
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role._id.toString()] = role;
    });

    return roleIds.map(id => roleMap[id.toString()] || null);
  });
};

module.exports = createRoleLoader;
