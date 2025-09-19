import { Settings, Table, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const BulkHttpVerbConfig = ({
  selectedTables,
  selectedService,
  onPermissionsChange,
  existingPermissions = [],
  onRemoveTable,
}) => {
  const [bulkActions, setBulkActions] = useState({
    GET: false,
    POST: false,
    PUT: false,
    PATCH: false,
    DELETE: false,
  });

  const [tablePermissions, setTablePermissions] = useState({});

  // Initialize table permissions when tables change
  useEffect(() => {
    if (selectedTables.length > 0) {
      const initialPermissions = {};
      selectedTables.forEach(table => {
        // Find existing permissions for this table
        const existingTablePermission = existingPermissions.find(
          perm =>
            perm.objectName === `/table/${table.name}` || perm.objectName === `_table/${table.name}`
        );

        // If we have existing permissions, use them; otherwise default to false
        const tableActions = existingTablePermission?.actions || {};

        initialPermissions[table.name] = {
          GET: tableActions.GET || false,
          POST: tableActions.POST || false,
          PUT: tableActions.PUT || false,
          PATCH: tableActions.PATCH || false,
          DELETE: tableActions.DELETE || false,
        };
      });
      setTablePermissions(initialPermissions);
    } else {
      setTablePermissions({});
    }
  }, [selectedTables, existingPermissions]);

  // Notify parent when permissions change
  useEffect(() => {
    const permissions = Object.entries(tablePermissions).map(([tableName, actions]) => ({
      serviceId: selectedService,
      objectName: `/table/${tableName}`,
      actions: actions,
    }));
    onPermissionsChange(permissions);
  }, [tablePermissions, selectedService, onPermissionsChange]);

  const handleBulkActionChange = (action, checked) => {
    setBulkActions(prev => ({ ...prev, [action]: checked }));

    // Apply to all selected tables
    setTablePermissions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(tableName => {
        updated[tableName] = { ...updated[tableName], [action]: checked };
      });
      return updated;
    });
  };

  const handleTableActionChange = (tableName, action, checked) => {
    setTablePermissions(prev => ({
      ...prev,
      [tableName]: {
        ...prev[tableName],
        [action]: checked,
      },
    }));
  };

  const handleRemoveTable = tableName => {
    // Remove from local permissions state
    setTablePermissions(prev => {
      const updated = { ...prev };
      delete updated[tableName];
      return updated;
    });

    // Remove from parent's selectedTables array if callback is provided
    if (onRemoveTable) {
      onRemoveTable(tableName);
    }
  };

  const getSelectedActionsCount = actions => {
    return Object.values(actions).filter(Boolean).length;
  };

  // Get the object types from selectedTables to determine dynamic labels
  const getObjectTypeInfo = () => {
    // Since we're configuring API endpoints, use "endpoints" terminology
    return { label: 'endpoints', single: 'endpoint' };
  };

  const objectTypeInfo = getObjectTypeInfo();

  if (selectedTables.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            Select database objects from the previous step to configure HTTP methods
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk HTTP Method Configuration
          </CardTitle>
          <CardDescription>
            Apply HTTP methods to all selected {objectTypeInfo.label} at once, then customize
            individual {objectTypeInfo.label} if needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={`bulk-${method}`}
                  checked={bulkActions[method]}
                  onCheckedChange={checked => handleBulkActionChange(method, checked)}
                />
                <Label htmlFor={`bulk-${method}`} className="text-sm font-medium cursor-pointer">
                  {method}
                </Label>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Selected methods will be applied to all {selectedTables.length}{' '}
            {selectedTables.length === 1 ? objectTypeInfo.single : objectTypeInfo.label}
          </div>
        </CardContent>
      </Card>

      {/* Individual Object Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Individual Endpoint Permissions
          </CardTitle>
          <CardDescription>
            Fine-tune HTTP methods for each endpoint. You can override the bulk settings here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <TableUI>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint Name</TableHead>
                  <TableHead>GET</TableHead>
                  <TableHead>POST</TableHead>
                  <TableHead>PUT</TableHead>
                  <TableHead>PATCH</TableHead>
                  <TableHead>DELETE</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-[50px]">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTables.map(table => {
                  const permissions = tablePermissions[table.name] || {};
                  const actionsCount = getSelectedActionsCount(permissions);

                  return (
                    <TableRow key={table.name}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{table.name}</span>
                          {table.schema && (
                            <span className="text-xs text-muted-foreground">{table.schema}</span>
                          )}
                        </div>
                      </TableCell>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                        <TableCell key={method}>
                          <Checkbox
                            checked={permissions[method] || false}
                            onCheckedChange={checked =>
                              handleTableActionChange(table.name, method, checked)
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {actionsCount} method{actionsCount !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTable(table.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TableUI>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Permission Summary</h4>
              <p className="text-sm text-muted-foreground">
                {selectedTables.length}{' '}
                {selectedTables.length === 1 ? objectTypeInfo.single : objectTypeInfo.label}{' '}
                configured with API access
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                Total Endpoints:{' '}
                {Object.values(tablePermissions).reduce(
                  (total, permissions) => total + getSelectedActionsCount(permissions),
                  0
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Across {selectedTables.length}{' '}
                {selectedTables.length === 1 ? objectTypeInfo.single : objectTypeInfo.label}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkHttpVerbConfig;
