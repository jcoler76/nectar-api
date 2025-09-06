const DataLoader = require('dataloader');
const Connection = require('../../models/Connection');

const createConnectionLoader = () => {
  return new DataLoader(async connectionIds => {
    const connections = await Connection.find({ _id: { $in: connectionIds } }).populate(
      'createdBy'
    );

    // Return connections in the same order as the input IDs
    const connectionMap = {};
    connections.forEach(connection => {
      connectionMap[connection._id.toString()] = connection;
    });

    return connectionIds.map(id => connectionMap[id.toString()] || null);
  });
};

module.exports = createConnectionLoader;
