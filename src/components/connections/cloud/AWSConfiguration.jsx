import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

const AWSConfiguration = ({ formData, handleChange }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label htmlFor="region">AWS Region</Label>
        <Input
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          placeholder="us-east-1"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endpoint">RDS Endpoint</Label>
        <Input
          id="endpoint"
          name="endpoint"
          value={formData.endpoint}
          onChange={handleChange}
          placeholder="mydb.cluster-xxx.us-east-1.rds.amazonaws.com"
        />
      </div>
    </div>
  );
};

export default AWSConfiguration;
