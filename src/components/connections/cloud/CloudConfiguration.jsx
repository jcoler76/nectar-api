import { Tooltip } from '@mui/material';
import { HelpCircle } from 'lucide-react';

import { getDatabaseType } from '../../../constants/databaseTypes';

import AWSConfiguration from './AWSConfiguration';
import AzureConfiguration from './AzureConfiguration';
import GCPConfiguration from './GCPConfiguration';
import SnowflakeConfiguration from './SnowflakeConfiguration';

const CloudConfiguration = ({ formData, handleChange, updateFormData }) => {
  const dbType = getDatabaseType(formData.type);

  if (!dbType?.cloudProvider) {
    return null;
  }

  const renderCloudSpecificFields = () => {
    switch (dbType.cloudProvider) {
      case 'AWS':
        return <AWSConfiguration formData={formData} handleChange={handleChange} />;
      case 'Azure':
        return <AzureConfiguration formData={formData} handleChange={handleChange} />;
      case 'GCP':
        return <GCPConfiguration formData={formData} handleChange={handleChange} />;
      case 'Snowflake':
        return (
          <SnowflakeConfiguration
            formData={formData}
            handleChange={handleChange}
            updateFormData={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-600 font-medium">☁️ Cloud Configuration</span>
        <Tooltip title={`Configure ${dbType.cloudProvider}-specific settings for ${dbType.label}`}>
          <HelpCircle className="h-4 w-4 text-blue-500 cursor-help" />
        </Tooltip>
      </div>
      {renderCloudSpecificFields()}
    </div>
  );
};

export default CloudConfiguration;
