const DataLoader = require('dataloader');
const Service = require('../../models/Service');

const createServiceLoader = () => {
  return new DataLoader(async serviceIds => {
    const services = await Service.find({ _id: { $in: serviceIds } })
      .populate('createdBy')
      .populate('connectionId');

    // Return services in the same order as the input IDs
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service._id.toString()] = service;
    });

    return serviceIds.map(id => serviceMap[id.toString()] || null);
  });
};

module.exports = createServiceLoader;
