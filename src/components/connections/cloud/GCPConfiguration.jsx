import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

const GCPConfiguration = ({ formData, handleChange }) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project ID</Label>
          <Input
            id="projectId"
            name="projectId"
            value={formData.projectId}
            onChange={handleChange}
            placeholder="my-gcp-project"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            name="region"
            value={formData.region}
            onChange={handleChange}
            placeholder="us-central1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="instanceConnectionName">Instance Connection Name</Label>
        <Input
          id="instanceConnectionName"
          name="instanceConnectionName"
          value={formData.instanceConnectionName}
          onChange={handleChange}
          placeholder="project:region:instance"
        />
      </div>
    </>
  );
};

export default GCPConfiguration;
