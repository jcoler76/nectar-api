const Role = require('../../models/Role');
const Application = require('../../models/Application');
const ApiUsage = require('../../models/ApiUsage');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { createCursorConnection } = require('../utils/pagination');
const { fetchSchemaFromDatabase } = require('../../utils/schemaUtils');

const roleResolvers = {
  // Type resolvers
  Role: {
    service: async (role, _, { dataloaders }) => {
      return dataloaders.serviceLoader.load(role.serviceId);
    },

    creator: async (role, _, { dataloaders }) => {
      return dataloaders.userLoader.load(role.createdBy);
    },

    applications: async role => {
      return Application.find({ defaultRole: role._id });
    },

    usageCount: async role => {
      return ApiUsage.countDocuments({ role: role._id });
    },

    lastUsed: async role => {
      const lastUsage = await ApiUsage.findOne({ role: role._id })
        .sort({ timestamp: -1 })
        .select('timestamp');
      return lastUsage?.timestamp || null;
    },
  },

  Permission: {
    service: async (permission, _, { dataloaders }) => {
      return dataloaders.serviceLoader.load(permission.serviceId);
    },
  },

  // Query resolvers
  Query: {
    role: async (_, { id }, { user, jwtUser, apiKeyUser, dataloaders }) => {
      // Block client API keys from accessing role management
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const role = await dataloaders.roleLoader.load(id);
      if (!role) return null;

      // Check if user can access this role
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      return role;
    },

    roles: async (
      _,
      { first = 10, after, filters = {}, orderBy = 'DESC' },
      { user, jwtUser, apiKeyUser }
    ) => {
      // Block client API keys from accessing roles list
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = {};

      // Apply filters
      if (filters.name) {
        query.name = { $regex: filters.name, $options: 'i' };
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.serviceId) {
        query.serviceId = filters.serviceId;
      }
      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      } else if (!user.isAdmin) {
        // Non-admin users can only see their own roles
        query.createdBy = user.userId;
      }
      if (filters.hasPermissions !== undefined) {
        if (filters.hasPermissions) {
          query['permissions.0'] = { $exists: true };
        } else {
          query.permissions = { $size: 0 };
        }
      }

      return createCursorConnection(Role, { first, after }, query, {
        createdAt: orderBy === 'DESC' ? -1 : 1,
      });
    },

    serviceRoles: async (_, { serviceId }, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing service roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      const query = { serviceId };
      if (!user.isAdmin) {
        query.createdBy = user.userId;
      }

      return Role.find(query).sort({ name: 1 });
    },

    userRoles: async (_, { userId }, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing user roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      // Users can only see their own roles unless they're admin
      const targetUserId = userId || user.userId;
      if (targetUserId !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      return Role.find({ createdBy: targetUserId }).sort({ name: 1 });
    },

    myRoles: async (_, __, { user, jwtUser, apiKeyUser }) => {
      // Block client API keys from accessing roles
      if (apiKeyUser && apiKeyUser.type === 'client') {
        throw new ForbiddenError('Client API keys cannot access role management');
      }

      if (!user) throw new AuthenticationError('Authentication required');

      return Role.find({ createdBy: user.userId }).sort({ name: 1 });
    },
  },

  // Mutation resolvers
  Mutation: {
    createRole: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = new Role({
        ...input,
        createdBy: user.userId,
      });

      await role.save();
      return role;
    },

    updateRole: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      Object.assign(role, input);
      await role.save();

      return role;
    },

    deleteRole: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // Check if role is being used by applications
      const applicationsUsingRole = await Application.countDocuments({ defaultRole: id });
      if (applicationsUsingRole > 0) {
        throw new UserInputError(
          `Cannot delete role. It is being used by ${applicationsUsingRole} application(s).`
        );
      }

      await Role.findByIdAndDelete(id);
      return true;
    },

    activateRole: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      role.isActive = true;
      await role.save();

      return role;
    },

    deactivateRole: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      role.isActive = false;
      await role.save();

      return role;
    },

    addPermission: async (_, { roleId, permission }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(roleId);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // Check if permission already exists
      const existingPermission = role.permissions.find(
        p =>
          p.serviceId.toString() === permission.serviceId && p.objectName === permission.objectName
      );

      if (existingPermission) {
        throw new UserInputError('Permission for this service and object already exists');
      }

      role.permissions.push(permission);
      await role.save();

      return role;
    },

    removePermission: async (_, { roleId, serviceId, objectName }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(roleId);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      role.permissions = role.permissions.filter(
        p => !(p.serviceId.toString() === serviceId && p.objectName === objectName)
      );

      await role.save();

      return role;
    },

    updatePermission: async (_, { roleId, permission }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(roleId);
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      const existingPermissionIndex = role.permissions.findIndex(
        p =>
          p.serviceId.toString() === permission.serviceId && p.objectName === permission.objectName
      );

      if (existingPermissionIndex === -1) {
        throw new UserInputError('Permission not found');
      }

      role.permissions[existingPermissionIndex] = {
        ...role.permissions[existingPermissionIndex].toObject(),
        ...permission,
      };

      await role.save();

      return role;
    },

    testRole: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id).populate('serviceId');
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      const permissionTests = [];

      for (const permission of role.permissions) {
        try {
          // Test database connection for this permission
          await fetchSchemaFromDatabase(role.serviceId, permission.objectName);

          permissionTests.push({
            objectName: permission.objectName,
            actions: permission.actions,
            accessible: true,
            errors: [],
          });
        } catch (error) {
          permissionTests.push({
            objectName: permission.objectName,
            actions: permission.actions,
            accessible: false,
            errors: [error.message],
          });
        }
      }

      const allAccessible = permissionTests.every(test => test.accessible);

      return {
        success: allAccessible,
        message: allAccessible ? 'All permissions are accessible' : 'Some permissions have issues',
        permissions: permissionTests,
      };
    },

    refreshRoleSchemas: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Authentication required');

      const role = await Role.findById(id).populate('serviceId');
      if (!role) {
        throw new UserInputError('Role not found');
      }

      // Check ownership
      if (role.createdBy.toString() !== user.userId && !user.isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      // Refresh schemas for all permissions
      for (const permission of role.permissions) {
        try {
          const schema = await fetchSchemaFromDatabase(role.serviceId, permission.objectName);
          permission.schema = {
            lastUpdated: new Date(),
            ...schema,
          };
        } catch (error) {
          console.error(`Failed to refresh schema for ${permission.objectName}:`, error);
          permission.schema = {
            lastUpdated: new Date(),
            error: error.message,
          };
        }
      }

      await role.save();

      return role;
    },
  },
};

module.exports = roleResolvers;
