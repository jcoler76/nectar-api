import {
  Add as AddIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import api from '../../services/api';

const TermsManagement = () => {
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state for new terms
  const [formData, setFormData] = useState({
    version: '',
    content: '',
    summary: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Fetch all terms versions
  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/terms/versions');
      if (response.data.success) {
        setVersions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching terms versions:', err);
      setError('Failed to load terms versions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch acceptance statistics
  const fetchStats = async organizationId => {
    try {
      const response = await api.get(`/api/terms/stats/${organizationId}`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchVersions();
    // Fetch stats for the user's organization (you'd get this from auth context)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.organizationId) {
      fetchStats(user.organizationId);
    }
  }, []);

  const handleCreateTerms = async () => {
    try {
      setError(null);
      const response = await api.post('/api/terms/versions', formData);
      if (response.data.success) {
        setSuccess('New Terms and Conditions version created successfully');
        setShowCreateDialog(false);
        setFormData({
          version: '',
          content: '',
          summary: '',
          effectiveDate: new Date().toISOString().split('T')[0],
        });
        fetchVersions();
      }
    } catch (err) {
      console.error('Error creating terms:', err);
      setError('Failed to create new terms version');
    }
  };

  const handleExportAcceptances = async organizationId => {
    try {
      const response = await api.get(`/api/terms/export/${organizationId}?format=csv`);

      // Create a blob from the CSV data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `terms-acceptances-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Acceptance records exported successfully');
    } catch (err) {
      console.error('Error exporting acceptances:', err);
      setError('Failed to export acceptance records');
    }
  };

  const handleViewTerms = terms => {
    setSelectedTerms(terms);
    setShowViewDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Terms and Conditions Management
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">{stats.totalUsers}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Accepted Terms
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.acceptedCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Acceptance
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.pendingCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Acceptance Rate
                </Typography>
                <Typography variant="h4">{stats.acceptanceRate}%</Typography>
                <LinearProgress variant="determinate" value={stats.acceptanceRate} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Actions Bar */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
        >
          Create New Version
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.organizationId) {
              handleExportAcceptances(user.organizationId);
            }
          }}
        >
          Export Acceptances
        </Button>
      </Box>

      {/* Terms Versions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Effective Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Acceptances</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No terms versions found
                </TableCell>
              </TableRow>
            ) : (
              versions.map(version => (
                <TableRow key={version.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{version.version}</Typography>
                  </TableCell>
                  <TableCell>{format(new Date(version.effectiveDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {version.isActive ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{version._count?.acceptances || 0}</TableCell>
                  <TableCell>{format(new Date(version.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => handleViewTerms(version)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create New Version Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Terms and Conditions Version</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Version"
              placeholder="e.g., 2.0.0"
              value={formData.version}
              onChange={e => setFormData({ ...formData, version: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Summary of Changes"
              placeholder="Brief description of what changed in this version"
              value={formData.summary}
              onChange={e => setFormData({ ...formData, summary: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Effective Date"
              type="date"
              value={formData.effectiveDate}
              onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Terms Content (HTML)"
              placeholder="Enter the full terms and conditions content in HTML format"
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              multiline
              rows={10}
              required
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTerms}
            variant="contained"
            disabled={!formData.version || !formData.content || !formData.effectiveDate}
          >
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Terms Dialog */}
      <Dialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Terms and Conditions - Version {selectedTerms?.version}</DialogTitle>
        <DialogContent dividers>
          {selectedTerms && (
            <Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Effective Date: {format(new Date(selectedTerms.effectiveDate), 'MMMM d, yyyy')}
              </Typography>
              {selectedTerms.summary && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Summary:</strong> {selectedTerms.summary}
                  </Typography>
                </Alert>
              )}
              <Box
                dangerouslySetInnerHTML={{ __html: selectedTerms.content }}
                sx={{
                  '& h1, & h2, & h3': { mt: 2, mb: 1 },
                  '& p': { mb: 1 },
                  '& ul, & ol': { mb: 1, pl: 3 },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TermsManagement;
