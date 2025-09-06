import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import UndoIcon from '@mui/icons-material/Undo';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WorkflowBuilderTopNav = ({
  workflowName,
  onRename,
  isActive,
  onToggleActive,
  onSave,
  onAddNode,
  onExecute,
  isExecuting,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleHistory,
  onLayout,
}) => {
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(workflowName);

  useEffect(() => {
    setNewName(workflowName);
  }, [workflowName]);

  const handleRename = () => {
    if (newName && newName !== workflowName) {
      onRename(newName);
    }
    setIsEditingName(false);
  };

  const handleCancelRename = () => {
    setNewName(workflowName);
    setIsEditingName(false);
  };

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.ctrlKey) {
        if (event.key === 'z') {
          event.preventDefault();
          if (canUndo) onUndo();
        } else if (event.key === 'y') {
          event.preventDefault();
          if (canRedo) onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onRedo, canUndo, canRedo]);

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate('/workflows')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        {isEditingName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <TextField
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              size="small"
              variant="outlined"
              autoFocus
            />
            <IconButton onClick={handleRename}>
              <CheckIcon />
            </IconButton>
            <IconButton onClick={handleCancelRename}>
              <CloseIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {workflowName}
            </Typography>
            <IconButton onClick={() => setIsEditingName(true)} sx={{ ml: 1 }} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <Tooltip title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}>
            <span>
              <IconButton onClick={onUndo} disabled={!canUndo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={canRedo ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}>
            <span>
              <IconButton onClick={onRedo} disabled={!canRedo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Auto-layout">
            <span>
              <IconButton onClick={onLayout}>
                <ShuffleIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={onToggleActive}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#0ea5e9',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#0ea5e9',
                  },
                }}
              />
            }
            label={isActive ? 'Active' : 'Inactive'}
          />
          <Tooltip title="Add Node">
            <IconButton
              variant="outlined"
              onClick={onAddNode}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                color: '#0ea5e9', // ocean-500
                '&:hover': { backgroundColor: 'rgba(14, 165, 233, 0.08)' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Test Run">
            <IconButton
              variant="outlined"
              onClick={onExecute}
              disabled={isExecuting}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                color: '#0ea5e9', // ocean-500
                '&:hover': { backgroundColor: 'rgba(14, 165, 233, 0.08)' },
              }}
            >
              {isExecuting ? (
                <CircularProgress size={24} sx={{ color: '#0ea5e9' }} />
              ) : (
                <PlayArrowIcon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="History">
            <IconButton
              variant="outlined"
              onClick={onToggleHistory}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                color: '#0ea5e9', // ocean-500
                '&:hover': { backgroundColor: 'rgba(14, 165, 233, 0.08)' },
              }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={onSave}
            sx={{
              backgroundColor: '#0ea5e9', // ocean-500
              '&:hover': {
                backgroundColor: '#0284c7', // ocean-600
              },
              transition: 'all 0.2s ease',
            }}
          >
            Save
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default WorkflowBuilderTopNav;
