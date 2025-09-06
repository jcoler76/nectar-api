/* eslint-disable import/order */
import {
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Input as InputIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Bot, CheckCircle, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

import api from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import SchemaControls from './SchemaControls';
/* eslint-enable import/order */
const EndpointDetails = ({ endpoint, onSchemaUpdate }) => {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSchemaUpdate = newSchema => {
    if (onSchemaUpdate) {
      onSchemaUpdate(endpoint.path, newSchema);
    }
  };

  const handleAIEnhance = async () => {
    setAiModalOpen(true);
    setAiEnhancing(true);
    setError(null);

    try {
      const enhanceUrl = `/api/documentation/ai-enhance/${endpoint.roleId}/${endpoint.permissionId}`;
      const response = await api.get(enhanceUrl);
      setAiResult(response.data);
    } catch (err) {
      setError(err.message || 'Failed to enhance documentation');
    } finally {
      setAiEnhancing(false);
    }
  };

  const getParameterTypeColor = (type = '') => {
    const paramType = type.toLowerCase();
    switch (paramType) {
      case 'int':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'primary';
      case 'varchar':
      case 'nvarchar':
      case 'char':
      case 'text':
        return 'success';
      case 'datetime':
      case 'date':
        return 'warning';
      case 'bit':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (!endpoint) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{endpoint.path}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIEnhance}
            className="flex items-center gap-1"
          >
            <Bot className="h-3 w-3" />
            AI Enhance
          </Button>
          <SchemaControls endpoint={endpoint} onSchemaUpdate={handleSchemaUpdate} />
        </Box>
      </Box>

      <Chip label={endpoint.method} color="primary" size="small" sx={{ mb: 2 }} />

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {endpoint.description}
      </Typography>

      {endpoint.parameters?.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InputIcon color="primary" />
              <Typography>Parameters</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>I/O</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoint.parameters.map((param, index) => {
                  const uniqueKey = `${endpoint.path}-${param.name || ''}-${param.parameterId || ''}-${index}`;

                  return (
                    <TableRow key={uniqueKey}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {param.name?.replace('@', '')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.type}
                          size="small"
                          color={getParameterTypeColor(param.type)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.isNullable ? 'Optional' : 'Required'}
                          size="small"
                          color={param.isNullable ? 'default' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.isOutput ? 'Output' : 'Input'}
                          size="small"
                          color={param.isOutput ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      )}

      {(endpoint.procedureInfo || endpoint.metadata) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon color="primary" />
              <Typography>Details</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ space: 2 }}>
              {endpoint.procedureInfo && endpoint.procedureInfo.name && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Procedure:</strong> {endpoint.procedureInfo.name}
                </Typography>
              )}

              {endpoint.metadata && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Schema:</strong> {endpoint.metadata.schema || 'dbo'}
                  </Typography>
                  {endpoint.metadata.created && (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Created:</strong>{' '}
                      {new Date(endpoint.metadata.created).toLocaleDateString()}
                    </Typography>
                  )}
                  {endpoint.metadata.modified && (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Modified:</strong>{' '}
                      {new Date(endpoint.metadata.modified).toLocaleDateString()}
                    </Typography>
                  )}
                  {endpoint.metadata.schemaLastUpdated && (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Schema Updated:</strong>{' '}
                      {new Date(endpoint.metadata.schemaLastUpdated).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}

              {endpoint.procedureInfo && endpoint.procedureInfo.procedure_definition && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Procedure Definition:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      backgroundColor: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1,
                    }}
                  >
                    {endpoint.procedureInfo.procedure_definition}
                  </Typography>
                </Box>
              )}

              {endpoint.procedureInfo && endpoint.procedureInfo.apiDocumentation && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    API Information:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Summary:</strong> {endpoint.procedureInfo.apiDocumentation.summary}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Description:</strong>{' '}
                    {endpoint.procedureInfo.apiDocumentation.description}
                  </Typography>
                </Box>
              )}

              {!endpoint.procedureInfo && !endpoint.metadata && (
                <Typography variant="body2" color="text.secondary">
                  No detailed information available. Try refreshing the schema.
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {endpoint.error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error: {endpoint.error}
        </Typography>
      )}

      {/* AI Enhancement Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Enhancement - {endpoint.objectName?.replace(/^.*\//, '')}
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis and documentation enhancement for this endpoint.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {aiEnhancing && (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground">Analyzing endpoint with AI...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {!aiEnhancing && aiResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enhancement Result</h3>
                  <div className="flex items-center gap-2">
                    {aiResult.enhanced ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Enhanced
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    {aiResult.cached && <Badge variant="secondary">Cached</Badge>}
                  </div>
                </div>

                {aiResult.enhanced && aiResult.documentation && (
                  <div className="space-y-4">
                    {aiResult.documentation.structured?.summary && (
                      <div>
                        <h4 className="font-medium mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                          {aiResult.documentation.structured.summary}
                        </p>
                      </div>
                    )}

                    {aiResult.documentation.sections?.businessPurpose && (
                      <div>
                        <h4 className="font-medium mb-2">Business Purpose</h4>
                        <div className="text-sm prose prose-sm max-w-none">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(
                                (aiResult.documentation.sections.businessPurpose || '').replace(
                                  /\n/g,
                                  '<br>'
                                )
                              ),
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {aiResult.documentation.structured?.examples &&
                      aiResult.documentation.structured.examples.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Response Examples</h4>
                          <div className="space-y-2">
                            {aiResult.documentation.structured.examples.map((example, index) => (
                              <div key={index} className="border rounded p-3">
                                <div className="font-medium text-sm mb-1">
                                  {example.name || `Example ${index + 1}`}
                                </div>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(example.data, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {aiResult.cached && aiResult.cacheAge && (
                      <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                        ℹ️ This analysis was cached {aiResult.cacheAge} hours ago to save AI tokens.
                      </div>
                    )}
                  </div>
                )}

                {!aiResult.enhanced && (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground mb-2">Enhancement failed</p>
                    <p className="text-sm text-red-600">{aiResult.reason}</p>
                    {aiResult.fallback && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium mb-1">Fallback Documentation:</p>
                        <p className="text-sm">{aiResult.fallback.summary}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => setAiModalOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EndpointDetails;
