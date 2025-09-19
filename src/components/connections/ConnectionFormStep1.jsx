import { Tooltip } from '@mui/material';
import { HelpCircle } from 'lucide-react';

import {
  DATABASE_TYPES,
  getCategories,
  getCategoryDisplayName,
  getDatabaseTypesByCategory,
} from '../../constants/databaseTypes';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const ConnectionFormStep1 = ({ formData, handleChange, handleDatabaseTypeChange }) => {
  return (
    <>
      {/* Connection Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="name">Connection Name *</Label>
          <Tooltip title="Unique identifier for this connection. Use descriptive names like 'prod-customer-db' or 'staging-inventory'. Cannot be changed after creation.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., prod-customer-db, staging-inventory"
        />
      </div>

      {/* Database Type */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Database Type *</Label>
          <Tooltip title="Select your database system type. This determines the connection protocol and default port. Each type has different features and capabilities.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Select value={formData.type} onValueChange={handleDatabaseTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select database type">
              {formData.type && (
                <div className="flex items-center gap-2">
                  <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.icon}</span>
                  <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {/* Group database types by category */}
            {getCategories().map(category => {
              const typesInCategory = getDatabaseTypesByCategory(category);
              if (typesInCategory.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                    {getCategoryDisplayName(category)}
                  </div>
                  {/* Database options in this category */}
                  {typesInCategory.map(dbType => (
                    <SelectItem key={dbType.value} value={dbType.value}>
                      <div className="flex items-center gap-2">
                        <span>{dbType.icon}</span>
                        <div className="flex flex-col">
                          <span>{dbType.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {dbType.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default ConnectionFormStep1;
