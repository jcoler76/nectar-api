import {
  Download,
  Search,
  Share,
  Trash2,
  Upload,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  FolderPlus,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import api from '../../services/api';
import { formatFileSize, formatTimestampEST } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

import FolderBrowser from './FolderBrowser';

const FileStorageDashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });

  // Folder navigation state
  const [currentPath, setCurrentPath] = useState('/');
  const [folderRefreshKey, setFolderRefreshKey] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [mimeTypeFilter, setMimeTypeFilter] = useState('all');
  const [isPublicFilter, setIsPublicFilter] = useState('all');
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Upload state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Folder creation state
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // File share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shareSettings, setShareSettings] = useState({
    isPublic: false,
    allowDownload: true,
    allowPreview: true,
    expiresIn: '',
    maxDownloads: '',
    password: '',
  });

  // Storage usage state
  const [storageUsage, setStorageUsage] = useState(null);

  // Fetch files for current folder
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Use folder API instead of legacy files API
      const params = new URLSearchParams({
        path: currentPath,
        include: 'files',
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
      });

      if (search) params.append('search', search);
      if (mimeTypeFilter && mimeTypeFilter !== 'all') params.append('mimeType', mimeTypeFilter);
      if (isPublicFilter && isPublicFilter !== 'all') params.append('isPublic', isPublicFilter);

      const response = await api.get(`/api/folders?${params}`);

      if (response.data.success) {
        const fileData = response.data.contents?.files || [];
        setFiles(fileData);
        // Update pagination based on actual results
        setPagination(prev => ({
          ...prev,
          total: fileData.length,
          pages: Math.ceil(fileData.length / prev.limit),
        }));
      } else {
        setError(response.data.message || 'Failed to fetch files');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [currentPath, pagination.page, pagination.limit, search, mimeTypeFilter, isPublicFilter]);

  // Fetch storage usage
  const fetchStorageUsage = useCallback(async () => {
    try {
      // Temporarily disabled due to backend issues
      // const response = await api.get('/api/files/storage/usage');
      // if (response.data.success) {
      //   setStorageUsage(response.data.data);
      // }

      // Mock data for now
      setStorageUsage({
        organizationName: 'Demo Org',
        subscriptionPlan: 'FREE',
        storage: {
          used: 0,
          limit: 1024 * 1024 * 1024, // 1GB
          usagePercentage: 0,
          isUnlimited: false,
        },
        files: {
          total: 0,
        },
        formattedStorage: {
          used: '0 Bytes',
          limit: '1 GB',
        },
      });
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchStorageUsage();
  }, [fetchFiles, fetchStorageUsage]);

  // Handle folder navigation
  const handlePathChange = newPath => {
    setCurrentPath(newPath);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await api.post('/api/folders', {
        name: newFolderName.trim(),
        parentPath: currentPath,
      });

      if (response.data.success) {
        setNewFolderName('');
        setShowCreateFolderDialog(false);
        fetchFiles(); // Refresh the file list
        setFolderRefreshKey(prev => prev + 1); // Trigger folder browser refresh
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) return;

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      Array.from(uploadFiles).forEach(file => {
        formData.append('files', file);
      });

      if (uploadTags) {
        formData.append('tags', JSON.stringify(uploadTags.split(',').map(tag => tag.trim())));
      }
      if (uploadDescription) formData.append('description', uploadDescription);
      formData.append('isPublic', uploadIsPublic.toString());
      formData.append('generateThumbnails', 'true');

      const response = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setUploadDialogOpen(false);
        setUploadFiles([]);
        setUploadTags('');
        setUploadDescription('');
        setUploadIsPublic(false);
        fetchFiles(); // Refresh file list
        fetchStorageUsage(); // Refresh storage usage
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async fileId => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await api.delete(`/api/files/${fileId}`);

      if (response.data.success) {
        fetchFiles(); // Refresh file list
        fetchStorageUsage(); // Refresh storage usage
      } else {
        setError(response.data.message || 'Failed to delete file');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  // Handle file sharing
  const handleShareFile = async () => {
    try {
      const shareData = {
        ...shareSettings,
        expiresIn: shareSettings.expiresIn ? parseInt(shareSettings.expiresIn) : undefined,
        maxDownloads: shareSettings.maxDownloads ? parseInt(shareSettings.maxDownloads) : undefined,
      };

      const response = await api.post(`/api/files/${selectedFile.id}/share`, shareData);

      if (response.data.success) {
        const shareUrl = response.data.share.shareUrl;
        navigator.clipboard.writeText(shareUrl);
        alert(`Share link copied to clipboard: ${shareUrl}`);
        setShareDialogOpen(false);
      } else {
        setError(response.data.message || 'Failed to create share link');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create share link');
    }
  };

  // Handle file download
  const handleDownloadFile = async file => {
    try {
      const response = await api.get(`/api/files/${file.id}?download=true`);

      if (response.data.success && response.data.file.downloadUrl) {
        window.open(response.data.file.downloadUrl, '_blank');
      } else {
        setError('Failed to get download URL');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download file');
    }
  };

  // Get file icon based on MIME type
  const getFileIcon = mimeType => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive'))
      return <Archive className="h-5 w-5 text-yellow-500" />;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - BaseListView Style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800">
            File Storage
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Upload, manage, and share files with secure cloud storage
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {/* New Folder Button */}
          <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ocean" className="flex-1 sm:flex-none">
                <FolderPlus className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Folder</span>
                <span className="hidden sm:inline">New Folder</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Create a new folder in {currentPath === '/' ? 'the root directory' : currentPath}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newFolderName">Folder Name</Label>
                  <Input
                    id="newFolderName"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    variant="ocean"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ocean" className="flex-1 sm:flex-none">
                <Upload className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Upload</span>
                <span className="hidden sm:inline">Upload Files</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
                <DialogDescription>Select files to upload to your secure storage</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="files">Select Files</Label>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    onChange={e => setUploadFiles(e.target.files)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={uploadTags}
                    onChange={e => setUploadTags(e.target.value)}
                    placeholder="document, important, project"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    placeholder="Optional description for the files"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={uploadIsPublic}
                    onCheckedChange={setUploadIsPublic}
                  />
                  <Label htmlFor="public">Make files public</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFileUpload}
                    disabled={uploading || uploadFiles.length === 0}
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : 'Upload'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Storage Usage Display */}
      {storageUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Storage Usage</span>
              <Badge
                variant={
                  storageUsage.storage.usagePercentage > 90
                    ? 'destructive'
                    : storageUsage.storage.usagePercentage > 75
                      ? 'default'
                      : 'secondary'
                }
              >
                {storageUsage.subscriptionPlan}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Used: {storageUsage.formattedStorage.used}</span>
                <span>Limit: {storageUsage.formattedStorage.limit}</span>
              </div>

              {!storageUsage.storage.isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      storageUsage.storage.usagePercentage > 90
                        ? 'bg-red-600'
                        : storageUsage.storage.usagePercentage > 75
                          ? 'bg-yellow-600'
                          : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(storageUsage.storage.usagePercentage, 100)}%` }}
                  />
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-600">
                <span>{storageUsage.files.total} files</span>
                {!storageUsage.storage.isUnlimited && (
                  <span>{storageUsage.storage.usagePercentage.toFixed(1)}% used</span>
                )}
              </div>

              {storageUsage.storage.usagePercentage > 90 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Storage is nearly full. Consider upgrading your plan or deleting unused files.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Browser */}
      <FolderBrowser
        currentPath={currentPath}
        onPathChange={handlePathChange}
        onRefresh={fetchFiles}
        refreshKey={folderRefreshKey}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search files..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="mimeType">File Type</Label>
              <Select value={mimeTypeFilter} onValueChange={setMimeTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={isPublicFilter} onValueChange={setIsPublicFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All files" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All files</SelectItem>
                  <SelectItem value="true">Public</SelectItem>
                  <SelectItem value="false">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploadedAt">Upload Date</SelectItem>
                  <SelectItem value="filename">Filename</SelectItem>
                  <SelectItem value="fileSize">File Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sortOrder">Order</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map(file => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file.filename}>
                          {file.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(parseInt(file.fileSize))}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadFile(file)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedFile(file);
                          setShareDialogOpen(true);
                        }}
                        title="Share"
                      >
                        <Share className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFile(file.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Thumbnail for images */}
                  {file.thumbnails && file.thumbnails.length > 0 && (
                    <div className="mb-3">
                      <img
                        src={file.thumbnails[0].cdnUrl}
                        alt={file.filename}
                        className="w-full h-32 object-cover rounded border"
                      />
                    </div>
                  )}

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Uploaded: {formatTimestampEST(file.uploadedAt)}</p>

                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge variant={file.isPublic ? 'default' : 'outline'}>
                        {file.isPublic ? 'Public' : 'Private'}
                      </Badge>

                      {file.uploader && (
                        <span>
                          by {file.uploader.firstName} {file.uploader.lastName}
                        </span>
                      )}
                    </div>

                    {file.description && (
                      <p className="italic truncate" title={file.description}>
                        {file.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                disabled={pagination.page === 1}
              >
                Previous
              </Button>

              <span className="flex items-center px-4">
                Page {pagination.page} of {pagination.pages}
              </span>

              <Button
                variant="outline"
                onClick={() =>
                  setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))
                }
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Create a shareable link for {selectedFile?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sharePublic"
                checked={shareSettings.isPublic}
                onCheckedChange={checked =>
                  setShareSettings(prev => ({ ...prev, isPublic: checked }))
                }
              />
              <Label htmlFor="sharePublic">Public access</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allowDownload"
                checked={shareSettings.allowDownload}
                onCheckedChange={checked =>
                  setShareSettings(prev => ({ ...prev, allowDownload: checked }))
                }
              />
              <Label htmlFor="allowDownload">Allow download</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allowPreview"
                checked={shareSettings.allowPreview}
                onCheckedChange={checked =>
                  setShareSettings(prev => ({ ...prev, allowPreview: checked }))
                }
              />
              <Label htmlFor="allowPreview">Allow preview</Label>
            </div>

            <div>
              <Label htmlFor="expiresIn">Expires in (seconds)</Label>
              <Input
                id="expiresIn"
                type="number"
                value={shareSettings.expiresIn}
                onChange={e => setShareSettings(prev => ({ ...prev, expiresIn: e.target.value }))}
                placeholder="3600 (1 hour)"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="maxDownloads">Max downloads</Label>
              <Input
                id="maxDownloads"
                type="number"
                value={shareSettings.maxDownloads}
                onChange={e =>
                  setShareSettings(prev => ({ ...prev, maxDownloads: e.target.value }))
                }
                placeholder="Leave empty for unlimited"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password protect</Label>
              <Input
                id="password"
                type="password"
                value={shareSettings.password}
                onChange={e => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Optional password"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleShareFile}>Create Share Link</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileStorageDashboard;
