import { Folder, ChevronRight, Home, MoreVertical, Edit, Trash2, FolderOpen } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import api from '../../services/api';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

const FolderBrowser = ({ currentPath, onPathChange, onRefresh, refreshKey }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');

  // Load folders for current path
  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/api/folders?path=${encodeURIComponent(currentPath)}&include=subfolders`
      );
      if (response.data.success) {
        setFolders(response.data.contents.folders || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders, refreshKey]);

  // Update folder name
  const handleUpdateFolder = async folderId => {
    if (!editName.trim()) return;

    try {
      const response = await api.put(`/api/folders/${folderId}`, {
        name: editName.trim(),
      });

      if (response.data.success) {
        setEditingFolder(null);
        setEditName('');
        loadFolders();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      alert('Failed to update folder: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId, folderName) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
      return;
    }

    try {
      const response = await api.delete(
        `/api/folders/${folderId}?recursive=true&deleteFiles=false`
      );

      if (response.data.success) {
        loadFolders();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder: ' + (error.response?.data?.message || error.message));
    }
  };

  // Navigate to folder
  const handleFolderClick = folderPath => {
    onPathChange(folderPath);
  };

  // Build breadcrumb from current path
  const breadcrumbItems = () => {
    if (currentPath === '/') {
      return [{ name: 'Root', path: '/' }];
    }

    const parts = currentPath.split('/').filter(Boolean);
    const items = [{ name: 'Root', path: '/' }];

    let buildPath = '';
    parts.forEach(part => {
      buildPath += `/${part}`;
      items.push({ name: part, path: buildPath });
    });

    return items;
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems().map((item, index) => (
            <React.Fragment key={item.path}>
              <BreadcrumbItem>
                {index === breadcrumbItems().length - 1 ? (
                  <BreadcrumbPage className="flex items-center">
                    {item.name === 'Root' ? (
                      <Home className="h-4 w-4 mr-1" />
                    ) : (
                      <FolderOpen className="h-4 w-4 mr-1" />
                    )}
                    {item.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => handleFolderClick(item.path)}
                    className="flex items-center cursor-pointer hover:text-blue-600"
                  >
                    {item.name === 'Root' ? (
                      <Home className="h-4 w-4 mr-1" />
                    ) : (
                      <Folder className="h-4 w-4 mr-1" />
                    )}
                    {item.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbItems().length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Folders Section Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Folders</h3>
      </div>

      {/* Folder Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-20 mb-2"></div>
              <div className="bg-gray-200 rounded h-4"></div>
            </div>
          ))}
        </div>
      ) : folders.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders.map(folder => (
            <div
              key={folder.id}
              className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Folder Icon and Content */}
              <div onClick={() => handleFolderClick(folder.path)}>
                <div className="flex flex-col items-center text-center space-y-2">
                  <Folder className="h-12 w-12 text-blue-600" />
                  <div className="w-full">
                    {editingFolder === folder.id ? (
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => handleUpdateFolder(folder.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleUpdateFolder(folder.id);
                          if (e.key === 'Escape') {
                            setEditingFolder(null);
                            setEditName('');
                          }
                        }}
                        className="text-sm text-center"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {folder.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {folder._count?.files || 0} files, {folder._count?.children || 0} folders
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation();
                        setEditingFolder(folder.id);
                        setEditName(folder.name);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No folders in this directory</p>
          <p className="text-sm">Create your first folder to get started</p>
        </div>
      )}
    </div>
  );
};

export default FolderBrowser;
