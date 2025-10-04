import { Bot, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';

import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const FolderMCPToggle = ({ folder, open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Configuration state
  const [config, setConfig] = useState({
    embedding_model: 'text-embedding-3-small',
    llm_model: 'gpt-4-turbo',
    chunk_size: 1000,
    chunk_overlap: 200,
    top_k_results: 5,
  });

  const handleEnableMCP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/api/folders/${folder.id}/mcp/enable`, {
        config,
      });

      if (response.data.success) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(response.data.message || 'Failed to enable MCP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable MCP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            Enable MCP on "{folder?.name}"
          </DialogTitle>
          <DialogDescription>
            Enable Model Context Protocol to allow AI agents to query documents in this folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning about costs */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Indexing will process all files in this folder and may incur
              OpenAI API costs for embeddings. Estimated cost depends on document size.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Embedding Model */}
          <div>
            <Label htmlFor="embedding_model">Embedding Model</Label>
            <Select
              value={config.embedding_model}
              onValueChange={value => setConfig(prev => ({ ...prev, embedding_model: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-embedding-3-small">
                  text-embedding-3-small (Recommended)
                </SelectItem>
                <SelectItem value="text-embedding-3-large">
                  text-embedding-3-large (Higher quality)
                </SelectItem>
                <SelectItem value="text-embedding-ada-002">
                  text-embedding-ada-002 (Legacy)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Smaller models are faster and cheaper, larger models provide better accuracy
            </p>
          </div>

          {/* LLM Model */}
          <div>
            <Label htmlFor="llm_model">LLM Model (for queries)</Label>
            <Select
              value={config.llm_model}
              onValueChange={value => setConfig(prev => ({ ...prev, llm_model: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Recommended)</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, cheaper)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chunk_size">Chunk Size</Label>
              <Input
                id="chunk_size"
                type="number"
                value={config.chunk_size}
                onChange={e =>
                  setConfig(prev => ({ ...prev, chunk_size: parseInt(e.target.value) }))
                }
                min="100"
                max="4000"
                step="100"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Characters per chunk</p>
            </div>

            <div>
              <Label htmlFor="chunk_overlap">Chunk Overlap</Label>
              <Input
                id="chunk_overlap"
                type="number"
                value={config.chunk_overlap}
                onChange={e =>
                  setConfig(prev => ({ ...prev, chunk_overlap: parseInt(e.target.value) }))
                }
                min="0"
                max="500"
                step="50"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Overlap between chunks</p>
            </div>
          </div>

          {/* Top K Results */}
          <div>
            <Label htmlFor="top_k_results">Top Results per Query</Label>
            <Input
              id="top_k_results"
              type="number"
              value={config.top_k_results}
              onChange={e =>
                setConfig(prev => ({ ...prev, top_k_results: parseInt(e.target.value) }))
              }
              min="1"
              max="20"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of relevant document chunks to retrieve
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleEnableMCP}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Enabling MCP...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Enable MCP
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderMCPToggle;
