import { Database, Loader2, Lock, Play, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const ConnectionForm = ({ open, onClose, onSave, connection, onTestConnection }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 1433,
    failoverHost: '',
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name || '',
        host: connection.host || '',
        port: connection.port || 1433,
        failoverHost: connection.failoverHost || '',
        username: connection.username || '',
        password: '', // Always keep password empty for security
      });
    } else {
      setFormData({
        name: '',
        host: '',
        port: 1433,
        failoverHost: '',
        username: '',
        password: '',
      });
    }
    setError('');
    setIsSubmitting(false);
    setIsTesting(false);
  }, [connection, open]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Filter out empty password string only for updates
      const dataToSave = { ...formData };
      if (connection && !dataToSave.password) {
        // Only delete password for updates when it's empty
        delete dataToSave.password;
      }

      await onSave(dataToSave);
    } catch (err) {
      setError(err.message || 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError('');

    try {
      await onTestConnection(formData);
    } catch (err) {
      setError(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {connection ? 'Edit Connection' : 'Add New Connection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connection Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Connection Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter connection name"
            />
          </div>

          {/* Host and Port */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="host">Host *</Label>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="host"
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  required
                  placeholder="localhost or IP address"
                />
              </div>
            </div>
            <div className="w-24 space-y-2">
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                name="port"
                type="number"
                value={formData.port}
                onChange={handleChange}
                required
                placeholder="1433"
              />
            </div>
          </div>

          {/* Failover Host */}
          <div className="space-y-2">
            <Label htmlFor="failoverHost">Failover Host</Label>
            <Input
              id="failoverHost"
              name="failoverHost"
              value={formData.failoverHost}
              onChange={handleChange}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Database username"
                className="pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password {!connection && '*'}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!connection}
                placeholder={
                  connection ? 'Leave blank to keep current password' : 'Database password'
                }
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {connection ? 'Leave blank to keep current password' : 'Required for new connections'}
            </p>
          </div>

          <DialogFooter className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || isSubmitting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isTesting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionForm;
