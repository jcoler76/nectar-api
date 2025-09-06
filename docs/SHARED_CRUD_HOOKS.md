# Shared CRUD Hooks Documentation

This document describes the shared CRUD hooks implementation for the Mirabel API frontend, eliminating code duplication across resource management hooks.

## Overview

The shared CRUD hooks system provides a standardized way to implement Create, Read, Update, Delete operations across all resources in the application. This eliminates ~200 lines of repetitive code per resource while maintaining flexibility for resource-specific requirements.

## Core Hook: `useCRUD`

### Basic Usage

```javascript
import { useCRUD } from './useCRUD';
import userService from '../services/userService';

const MyComponent = () => {
  const {
    items,
    loading,
    error,
    fetch,
    create,
    update,
    delete: deleteItem
  } = useCRUD({
    service: userService,
    itemName: 'user'
  });

  // Use the hook methods...
};
```

### Configuration Options

```javascript
const crud = useCRUD({
  // Required
  service,           // Service object with CRUD methods
  itemName,          // For error messages ('user', 'application', etc.)
  
  // Optional  
  initialFetch: true,              // Auto-fetch on mount (default: true)
  enableNotifications: true,       // Show success/error notifications (default: true)
  enableOperationTracking: true,   // Prevent double-execution (default: true)
  
  // Advanced configuration
  customActions: {
    regenerateKey: (id) => service.regenerateKey(id)
  },
  transformers: {
    export: (items) => items.map(transformForCsv)
  },
  permissions: {
    create: true,
    update: true,
    delete: user.isAdmin
  },
  onSuccess: (data, operation) => console.log('Success:', operation),
  onError: (error, operation) => console.error('Error:', operation)
});
```

## Service Requirements

Services must implement the following interface to work with `useCRUD`:

```javascript
// Required methods
const service = {
  getAll: async (params) => [...],      // Fetch all items
  create: async (data) => {...},       // Create new item
  update: async (id, data) => {...},   // Update existing item
  delete: async (id) => undefined,     // Delete item
  
  // Optional methods
  getById: async (id) => {...},        // Fetch single item
  action: async (id, actionName, data) => {...}  // Custom actions
};
```

## Specialized Hooks

### `useUsers`

```javascript
import { useUsers } from './useUsers';

const UserManagement = () => {
  const {
    // State
    users,                    // Array of user objects
    loading,                 // Boolean loading state
    error,                   // Error message string
    operationInProgress,     // Object tracking ongoing operations
    
    // CRUD Operations
    fetchUsers,              // () => Promise - Fetch all users
    createUser,              // (userData) => Promise - Create user
    updateUser,              // (id, userData) => Promise - Update user
    handleDelete,            // (id) => Promise - Delete user
    
    // Custom Operations
    handleToggleActive,      // (user) => Promise - Toggle user active state
    generateApiKey,          // (userId) => Promise - Generate API key
    inviteUser,              // (userData) => Promise - Send invitation
    
    // Utilities
    prepareExportData,       // () => Array - Format data for CSV export
    clearError,              // () => void - Clear error state
    refresh,                 // () => Promise - Refresh data
    getById,                 // (id) => Object - Find user by ID
    isEmpty,                 // Boolean - True if no users
    count                    // Number - User count
  } = useUsers();
  
  // Component implementation...
};
```

### `useApplications`

```javascript
import { useApplications } from './useApplications';

const ApplicationManagement = () => {
  const {
    // State
    applications,
    loading,
    error,
    operationInProgress,
    
    // CRUD Operations
    fetchApplications,
    createApplication,
    updateApplication,
    handleDelete,
    
    // Custom Operations
    handleToggleActive,
    handleRegenerateApiKey,
    handleRevealApiKey,
    handleCopyApiKey,
    
    // Utilities
    prepareExportData,
    clearError,
    refresh,
    getById,
    isEmpty,
    count
  } = useApplications();
  
  // Component implementation...
};
```

## Features

### 1. Optimistic Updates

All update and delete operations perform optimistic updates with automatic rollback on failure:

```javascript
const handleUpdate = async (id, data) => {
  // Immediately updates local state
  await update(id, data);
  // Automatically rolls back if API call fails
};
```

### 2. Operation Protection

Prevents double-execution of operations:

```javascript
// This will prevent concurrent deletes of the same item
await deleteItem(userId);
await deleteItem(userId); // Ignored if first call still pending
```

### 3. Automatic Error Handling

Consistent error handling with notifications:

```javascript
// Automatically shows error notifications
// Logs errors in development mode
// Preserves error context for custom handling
```

### 4. Data Transformation

Built-in support for data transformation (especially CSV export):

```javascript
const crud = useCRUD({
  service: userService,
  itemName: 'user',
  transformers: {
    export: (users) => users.map(user => ({
      Name: user.firstName + ' ' + user.lastName,
      Email: user.email,
      Role: user.isAdmin ? 'Admin' : 'User'
    }))
  }
});

// Later in component:
const csvData = prepareExportData(); // Uses transformer
```

### 5. Custom Actions

Support for resource-specific operations:

```javascript
const crud = useCRUD({
  service: userService,
  itemName: 'user',
  customActions: {
    generateApiKey: userService.generateApiKey,
    resetPassword: userService.resetPassword
  }
});

// Later in component:
await crud.generateApiKey(userId);
await crud.resetPassword(userId);
```

## Migration Guide

### Before (Traditional Hook)

```javascript
export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();
  const { operationInProgress, createProtectedHandler } = useOperationTracking();

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = createProtectedHandler('delete', async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(user => user._id !== userId));
      showNotification('User deleted successfully', 'success');
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete user';
      showNotification(errorMessage, 'error');
      setError('Failed to delete user');
      return { success: false, error: err };
    }
  });

  // ... 150+ more lines
};
```

### After (Using Shared Hook)

```javascript
export const useUsers = () => {
  const crud = useCRUD({
    service: userService,
    itemName: 'user',
    transformers: {
      export: (users) => users.map(user => ({
        Name: user.firstName + ' ' + user.lastName,
        Email: user.email,
        Role: user.isAdmin ? 'Admin' : 'User'
      }))
    }
  });

  return {
    // Backward compatibility mapping
    users: crud.items,
    loading: crud.loading,
    error: crud.error,
    operationInProgress: crud.operationInProgress,
    
    fetchUsers: crud.fetch,
    handleDelete: crud.delete,
    createUser: crud.create,
    updateUser: crud.update,
    
    prepareExportData: crud.prepareExportData,
    clearError: crud.clearError,
    refresh: crud.refresh,
    getById: crud.getById
  };
};
```

## Benefits

### Code Reduction
- **Before**: ~200 lines per resource hook
- **After**: ~30 lines per resource hook
- **Elimination**: 85% reduction in boilerplate code

### Consistency
- Standardized error handling across all resources
- Consistent notification patterns
- Uniform loading and operation states
- Predictable API patterns

### Maintainability
- Single source of truth for CRUD logic
- Centralized bug fixes benefit all resources
- Easier to add new features (affects all hooks)
- Simplified testing (test core hook once)

### Developer Experience
- Faster implementation of new resources
- Less cognitive load (same patterns everywhere)
- Better TypeScript support potential
- Reduced chance of implementation bugs

## Testing Strategy

### Core Hook Testing

Test the `useCRUD` hook with mock services:

```javascript
import { renderHook, act } from '@testing-library/react';
import { useCRUD } from './useCRUD';

const mockService = {
  getAll: jest.fn(),
  create: jest.fn(), 
  update: jest.fn(),
  delete: jest.fn()
};

test('should handle CRUD operations', async () => {
  const { result } = renderHook(() => 
    useCRUD({ service: mockService, itemName: 'test' })
  );
  
  // Test operations...
});
```

### Specialized Hook Testing

Test resource-specific behavior:

```javascript
test('useUsers should handle user-specific operations', async () => {
  const { result } = renderHook(() => useUsers());
  
  // Test user-specific functionality
  await act(async () => {
    await result.current.generateApiKey('user123');
  });
});
```

## Performance Considerations

### Memory Management
- Automatic cleanup of event listeners
- Proper dependency arrays in useCallback/useEffect
- No memory leaks from operation tracking

### Network Efficiency
- Optimistic updates reduce perceived latency
- Automatic request deduplication via operation protection
- Conditional fetching based on configuration

### Bundle Size
- Shared logic reduces overall bundle size
- Tree-shaking friendly exports
- Minimal external dependencies

## Future Enhancements

### Potential Additions
1. **Caching Layer**: Implement request caching with TTL
2. **Offline Support**: Queue operations when offline
3. **Real-time Updates**: WebSocket integration for live data
4. **Pagination**: Built-in pagination support
5. **Filtering**: Standardized filtering/search capabilities
6. **Undo/Redo**: Operation history with rollback capability

### TypeScript Support
Convert to TypeScript for better type safety:

```typescript
interface CRUDConfig<T> {
  service: CRUDService<T>;
  itemName: string;
  // ... other options
}

export const useCRUD = <T>(config: CRUDConfig<T>) => {
  // Implementation with full type safety
};
```

## Implementation Status

### Completed ✅
- [x] Core `useCRUD` hook implementation
- [x] `useUsers` hook refactored to use shared logic
- [x] `useApplications` hook refactored to use shared logic  
- [x] Service standardization for `userService` and `applicationService`
- [x] Backward compatibility maintenance
- [x] Documentation and usage examples

### In Progress 🚧
- [ ] Refactor remaining hooks (`useServices`, `useRoles`, `useWorkflows`, `useConnections`)
- [ ] Service standardization for remaining services
- [ ] Component testing and integration validation

### Future Enhancements 🔮
- [ ] TypeScript conversion
- [ ] Advanced caching layer
- [ ] Real-time data synchronization
- [ ] Enhanced error recovery patterns

This shared CRUD hooks system significantly reduces code duplication while maintaining the flexibility needed for resource-specific requirements, achieving the goals outlined in the Code Score Improvement plan.