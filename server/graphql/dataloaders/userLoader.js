const DataLoader = require('dataloader');
const User = require('../../models/User');

const createUserLoader = () => {
  return new DataLoader(async userIds => {
    const users = await User.find({ _id: { $in: userIds } }).populate('roles');

    // Return users in the same order as the input IDs
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    return userIds.map(id => userMap[id.toString()] || null);
  });
};

module.exports = createUserLoader;
