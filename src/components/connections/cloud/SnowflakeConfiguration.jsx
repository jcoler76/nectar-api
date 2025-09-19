import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const SnowflakeConfiguration = ({ formData, handleChange, updateFormData }) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="accountId">Account Identifier</Label>
          <Input
            id="accountId"
            name="accountId"
            value={formData.accountId}
            onChange={handleChange}
            placeholder="xy12345.us-east-1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="warehouseName">Warehouse Name</Label>
          <Input
            id="warehouseName"
            name="warehouseName"
            value={formData.warehouseName}
            onChange={handleChange}
            placeholder="COMPUTE_WH"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Authentication Method</Label>
        <Select
          value={formData.authMethod}
          onValueChange={value => updateFormData({ authMethod: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="password">Username/Password</SelectItem>
            <SelectItem value="keypair">Key Pair Authentication</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.authMethod === 'keypair' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <Input
              id="privateKey"
              name="privateKey"
              type="password"
              value={formData.privateKey}
              onChange={handleChange}
              placeholder="-----BEGIN PRIVATE KEY-----..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passphrase">Private Key Passphrase (optional)</Label>
            <Input
              id="passphrase"
              name="passphrase"
              type="password"
              value={formData.passphrase}
              onChange={handleChange}
              placeholder="Enter passphrase if key is encrypted"
            />
          </div>
        </>
      )}
    </>
  );
};

export default SnowflakeConfiguration;
