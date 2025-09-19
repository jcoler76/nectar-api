import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

const AzureConfiguration = ({ formData, handleChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="endpoint">Azure SQL Server Name</Label>
      <Input
        id="endpoint"
        name="endpoint"
        value={formData.endpoint}
        onChange={handleChange}
        placeholder="myserver.database.windows.net"
      />
    </div>
  );
};

export default AzureConfiguration;
