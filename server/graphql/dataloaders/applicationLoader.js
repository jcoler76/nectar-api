const DataLoader = require('dataloader');
const Application = require('../../models/Application');

const createApplicationLoader = () => {
  return new DataLoader(async applicationIds => {
    const applications = await Application.find({ _id: { $in: applicationIds } })
      .populate('createdBy')
      .populate('defaultRole');

    // Return applications in the same order as the input IDs
    const applicationMap = {};
    applications.forEach(application => {
      applicationMap[application._id.toString()] = application;
    });

    return applicationIds.map(id => applicationMap[id.toString()] || null);
  });
};

module.exports = createApplicationLoader;
