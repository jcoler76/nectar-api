const defaultLimit = parseInt(process.env.BLUEPRINTS_DEFAULT_LIMIT || '20', 10);
const maxLimit = parseInt(process.env.BLUEPRINTS_MAX_LIMIT || '100', 10);

module.exports = {
  enabled: (process.env.BLUEPRINTS_ENABLED || 'false').toLowerCase() === 'true',
  defaultLimit,
  maxLimit,
  // Allowlist of models exposed via blueprints
  models: {
    endpoints: {
      delegate: 'endpoint',
      idField: 'id',
      tenantScoped: true,
      fields: [
        'id',
        'name',
        'path',
        'method',
        'isActive',
        'createdAt',
        'updatedAt',
        'organizationId',
      ],
    },
    services: {
      delegate: 'service',
      idField: 'id',
      tenantScoped: true,
      fields: ['id', 'name', 'label', 'isActive', 'createdAt', 'updatedAt', 'organizationId'],
    },
    applications: {
      delegate: 'application',
      idField: 'id',
      tenantScoped: true,
      fields: ['id', 'name', 'isActive', 'createdAt', 'updatedAt', 'organizationId'],
    },
  },
};
