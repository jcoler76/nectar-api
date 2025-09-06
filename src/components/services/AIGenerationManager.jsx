import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  Description as DocumentationIcon,
  Schema as SchemaIcon,
  Functions as FunctionsIcon,
  DataObject as DataObjectIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  LinearProgress,
  IconButton,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Skeleton,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import React, { memo, useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useNotification } from '../../context/NotificationContext';
import aiGenerationService from '../../services/aiGenerationService';

// Artifact type configuration
const ARTIFACT_TYPES = [
  {
    id: 'graphql_schema',
    name: 'GraphQL Schema',
    icon: <SchemaIcon />,
    color: 'primary',
    language: 'graphql',
    description: 'Type definitions for GraphQL API',
  },
  {
    id: 'graphql_resolvers',
    name: 'GraphQL Resolvers',
    icon: <FunctionsIcon />,
    color: 'secondary',
    language: 'javascript',
    description: 'Resolver implementations for GraphQL',
  },
  {
    id: 'prisma_schema',
    name: 'Prisma Schema',
    icon: <DataObjectIcon />,
    color: 'success',
    language: 'prisma',
    description: 'Database models for Prisma ORM',
  },
  {
    id: 'typescript_types',
    name: 'TypeScript Types',
    icon: <CodeIcon />,
    color: 'info',
    language: 'typescript',
    description: 'Type definitions for TypeScript',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    icon: <DocumentationIcon />,
    color: 'warning',
    language: 'markdown',
    description: 'Developer documentation and guides',
  },
];

const AIGenerationManager = ({ open, onClose, serviceId, serviceName }) => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(ARTIFACT_TYPES.map(t => t.id));
  const [includeBusinessContext, setIncludeBusinessContext] = useState(true);
  const [artifactContent, setArtifactContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('raw');
  const [copySuccess, setCopySuccess] = useState(false);

  // Load initial data
  useEffect(() => {
    if (open && serviceId) {
      loadGenerationStatus();
      loadArtifacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serviceId]);

  const loadGenerationStatus = async () => {
    try {
      const status = await aiGenerationService.getGenerationStatus(serviceId);
      setGenerationStatus(status);
    } catch (error) {
      console.error('Failed to load generation status:', error);
      showNotification('Failed to load generation status', 'error');
    }
  };

  const loadArtifacts = async () => {
    setLoading(true);
    try {
      const response = await aiGenerationService.getArtifacts(serviceId, {
        latestOnly: !showHistory,
      });
      setArtifacts(response.data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
      showNotification('Failed to load artifacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      showNotification('Please select at least one artifact type', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const result = await aiGenerationService.generateArtifacts(serviceId, {
        artifactTypes: selectedTypes,
        includeBusinessContext,
        regenerate: false,
      });

      if (result.success) {
        showNotification(`Successfully generated ${result.generated} artifacts`, 'success');
        // Reload artifacts and status
        await Promise.all([loadArtifacts(), loadGenerationStatus()]);
      } else {
        showNotification(result.message || 'Generation failed', 'error');
      }
    } catch (error) {
      console.error('Generation error:', error);
      showNotification('Failed to generate artifacts', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async artifactTypes => {
    setGenerating(true);
    try {
      const result = await aiGenerationService.regenerateArtifacts(serviceId, {
        artifactTypes: Array.isArray(artifactTypes) ? artifactTypes : [artifactTypes],
      });

      if (result.success) {
        showNotification('Successfully regenerated artifacts', 'success');
        await Promise.all([loadArtifacts(), loadGenerationStatus()]);
      } else {
        showNotification(result.message || 'Regeneration failed', 'error');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      showNotification('Failed to regenerate artifacts', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewArtifact = async artifact => {
    setSelectedArtifact(artifact);
    setLoadingContent(true);
    try {
      const details = await aiGenerationService.getArtifactDetails(serviceId, artifact.id);
      setArtifactContent(details.data);
    } catch (error) {
      console.error('Failed to load artifact details:', error);
      showNotification('Failed to load artifact content', 'error');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDownload = async (artifactType, format = 'raw') => {
    try {
      await aiGenerationService.downloadArtifact(serviceId, artifactType, format);
      showNotification('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download artifact', 'error');
    }
  };

  const handleCopyToClipboard = async content => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const handleValidateArtifact = async artifactId => {
    try {
      const result = await aiGenerationService.validateArtifact(serviceId, artifactId);
      showNotification(result.message, result.success ? 'success' : 'warning');
      await loadArtifacts();
    } catch (error) {
      console.error('Validation error:', error);
      showNotification('Failed to validate artifact', 'error');
    }
  };

  const getArtifactIcon = artifactType => {
    const type = ARTIFACT_TYPES.find(t => t.id === artifactType);
    return type ? type.icon : <CodeIcon />;
  };

  const getLanguage = artifactType => {
    const type = ARTIFACT_TYPES.find(t => t.id === artifactType);
    return type ? type.language : 'javascript';
  };

  const renderGenerationTab = () => (
    <Box sx={{ p: 2 }}>
      {/* Generation Status */}
      {generationStatus && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generation Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Artifacts
                  </Typography>
                  <Typography variant="h4">{generationStatus.status.totalArtifacts}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Downloads
                  </Typography>
                  <Typography variant="h4">{generationStatus.status.totalDownloads}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Analysis
                  </Typography>
                  <Typography variant="h4">{generationStatus.status.pendingAnalysis}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Last Generation
                  </Typography>
                  <Typography variant="body2">
                    {new Date(generationStatus.status.lastGeneration).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Generation Options */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Artifacts
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Select artifact types to generate:
          </Typography>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {ARTIFACT_TYPES.map(type => (
              <Grid item key={type.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTypes.includes(type.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTypes([...selectedTypes, type.id]);
                        } else {
                          setSelectedTypes(selectedTypes.filter(t => t !== type.id));
                        }
                      }}
                      disabled={generating}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {type.icon}
                      <Typography variant="body2">{type.name}</Typography>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeBusinessContext}
              onChange={e => setIncludeBusinessContext(e.target.checked)}
              disabled={generating}
            />
          }
          label="Include business context in generation"
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={generating || selectedTypes.length === 0}
            startIcon={generating ? <LinearProgress size={20} /> : <AutoAwesomeIcon />}
          >
            {generating ? 'Generating...' : 'Generate Artifacts'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleRegenerate(selectedTypes)}
            disabled={generating || selectedTypes.length === 0}
            startIcon={<RefreshIcon />}
          >
            Regenerate Selected
          </Button>
        </Box>
      </Paper>

      {/* Artifact Status by Type */}
      {generationStatus?.artifactBreakdown && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Artifact Status by Type
          </Typography>
          <Grid container spacing={2}>
            {ARTIFACT_TYPES.map(type => {
              const status = generationStatus.artifactBreakdown[type.id];
              if (!status) return null;

              return (
                <Grid item xs={12} sm={6} md={4} key={type.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {type.icon}
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          {type.name}
                        </Typography>
                        {status.hasArtifact && (
                          <CheckCircleIcon color="success" sx={{ ml: 'auto' }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {type.description}
                      </Typography>
                      {status.hasArtifact && (
                        <>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Version: {status.latestVersion}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Generated: {new Date(status.generatedAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Downloads: {status.downloadCount}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                    <CardActions>
                      {status.hasArtifact ? (
                        <>
                          <Button
                            size="small"
                            onClick={() => handleDownload(type.id)}
                            startIcon={<DownloadIcon />}
                          >
                            Download
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleRegenerate(type.id)}
                            startIcon={<RefreshIcon />}
                          >
                            Regenerate
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedTypes([type.id]);
                            handleGenerate();
                          }}
                          startIcon={<AutoAwesomeIcon />}
                        >
                          Generate
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}
    </Box>
  );

  const renderArtifactsTab = () => (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Generated Artifacts</Typography>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={showHistory}
                onChange={e => {
                  setShowHistory(e.target.checked);
                  loadArtifacts();
                }}
              />
            }
            label="Show version history"
          />
          <IconButton onClick={loadArtifacts} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : artifacts.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No Artifacts Generated</AlertTitle>
          Go to the Generate tab to create new artifacts.
        </Alert>
      ) : (
        <List>
          {artifacts.map(artifact => (
            <Paper key={artifact.id} sx={{ mb: 1 }}>
              <ListItem
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View">
                      <IconButton onClick={() => handleViewArtifact(artifact)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton onClick={() => handleDownload(artifact.artifactType)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Validate">
                      <IconButton onClick={() => handleValidateArtifact(artifact.id)}>
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemIcon>{getArtifactIcon(artifact.artifactType)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{artifact.artifactName}</Typography>
                      <Chip
                        label={artifact.version}
                        size="small"
                        color={artifact.isLatest ? 'primary' : 'default'}
                      />
                      {artifact.status !== 'active' && (
                        <Chip label={artifact.status} size="small" color="warning" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {artifact.description ||
                          `Generated ${artifact.artifactType.replace('_', ' ')}`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Generated by {artifact.generatedBy} on{' '}
                        {new Date(artifact.generatedAt).toLocaleString()}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption">
                          {artifact.metadata.lineCount} lines
                        </Typography>
                        {artifact.validation.isValid ? (
                          <Typography variant="caption" color="success.main">
                            <CheckCircleIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            Valid
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="error.main">
                            <ErrorIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {artifact.validation.errorCount} errors
                          </Typography>
                        )}
                        <Typography variant="caption">
                          <DownloadIcon sx={{ fontSize: 12, mr: 0.5 }} />
                          {artifact.usage.downloadCount} downloads
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );

  const renderArtifactViewer = () => {
    if (!selectedArtifact || !artifactContent) return null;

    return (
      <Dialog
        open={Boolean(selectedArtifact)}
        onClose={() => {
          setSelectedArtifact(null);
          setArtifactContent(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getArtifactIcon(selectedArtifact.artifactType)}
              <Typography variant="h6">{selectedArtifact.artifactName}</Typography>
              <Chip label={selectedArtifact.version} size="small" color="primary" />
            </Box>
            <IconButton
              onClick={() => {
                setSelectedArtifact(null);
                setArtifactContent(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingContent ? (
            <Skeleton variant="rectangular" height={400} />
          ) : (
            <Box>
              {/* Metadata */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Metadata</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">
                        Generated By
                      </Typography>
                      <Typography variant="body2">
                        {artifactContent.generatedBy?.username}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">
                        Generated At
                      </Typography>
                      <Typography variant="body2">
                        {new Date(artifactContent.generatedAt).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">
                        AI Model
                      </Typography>
                      <Typography variant="body2">{artifactContent.aiModel}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">
                        Source Schemas
                      </Typography>
                      <Typography variant="body2">
                        {artifactContent.sourceSchemas?.length || 0} schemas
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Content */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Content</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(artifactContent.content.primary)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Box>
                    <SyntaxHighlighter
                      language={getLanguage(selectedArtifact.artifactType)}
                      style={vscDarkPlus}
                      showLineNumbers
                      customStyle={{ fontSize: '12px', maxHeight: '400px' }}
                    >
                      {artifactContent.content.primary}
                    </SyntaxHighlighter>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Validation */}
              {artifactContent.validation && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Validation
                      {artifactContent.validation.isValid ? (
                        <CheckCircleIcon color="success" sx={{ ml: 1, fontSize: 20 }} />
                      ) : (
                        <ErrorIcon color="error" sx={{ ml: 1, fontSize: 20 }} />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {artifactContent.validation.errors?.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="error" gutterBottom>
                          Errors ({artifactContent.validation.errors.length})
                        </Typography>
                        {artifactContent.validation.errors.map((error, index) => (
                          <Alert severity="error" key={index} sx={{ mb: 1 }}>
                            {error.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {artifactContent.validation.warnings?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                          Warnings ({artifactContent.validation.warnings.length})
                        </Typography>
                        {artifactContent.validation.warnings.map((warning, index) => (
                          <Alert severity="warning" key={index} sx={{ mb: 1 }}>
                            {warning.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {artifactContent.validation.isValid && (
                      <Alert severity="success">Artifact validation passed successfully</Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Usage */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Usage & Deployment</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="textSecondary">
                        Downloads
                      </Typography>
                      <Typography variant="h6">{artifactContent.usage.downloadCount}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="textSecondary">
                        Deployments
                      </Typography>
                      <Typography variant="h6">{artifactContent.usage.deploymentCount}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="textSecondary">
                        Environments
                      </Typography>
                      <Typography variant="body2">
                        {artifactContent.usage.deploymentEnvironments?.join(', ') || 'None'}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small">
              <InputLabel>Format</InputLabel>
              <Select
                value={downloadFormat}
                onChange={e => setDownloadFormat(e.target.value)}
                label="Format"
              >
                <MenuItem value="raw">Raw</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="yaml">YAML</MenuItem>
                <MenuItem value="markdown">Markdown</MenuItem>
              </Select>
            </FormControl>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(selectedArtifact.artifactType, downloadFormat)}
            >
              Download
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => handleRegenerate(selectedArtifact.artifactType)}
            >
              Regenerate
            </Button>
            <Button
              onClick={() => {
                setSelectedArtifact(null);
                setArtifactContent(null);
              }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon color="primary" />
              <Typography variant="h6">AI Generation Manager - {serviceName}</Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Generate" icon={<AutoAwesomeIcon />} iconPosition="start" />
            <Tab label="Artifacts" icon={<StorageIcon />} iconPosition="start" />
          </Tabs>

          {activeTab === 0 && renderGenerationTab()}
          {activeTab === 1 && renderArtifactsTab()}
        </DialogContent>
      </Dialog>

      {renderArtifactViewer()}

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard"
      />
    </>
  );
};

export default memo(AIGenerationManager);
