import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { CircularProgress, Tooltip } from '@mui/material';
import React from 'react';

const statusConfig = {
  running: {
    icon: <CircularProgress size={20} />,
    label: 'Running',
    color: 'primary.main',
  },
  success: {
    icon: <CheckCircleIcon />,
    label: 'Success',
    color: 'success.main',
  },
  failed: {
    icon: <ErrorIcon />,
    label: 'Failed',
    color: 'error.main',
  },
  waiting: {
    icon: <HourglassEmptyIcon />,
    label: 'Waiting',
    color: 'warning.main',
  },
};

const NodeStatusIcon = ({ status }) => {
  if (!status || !statusConfig[status]) {
    return null;
  }

  const { icon, label, color } = statusConfig[status];

  return (
    <Tooltip title={label}>
      <div style={{ color }}>{icon}</div>
    </Tooltip>
  );
};

export default NodeStatusIcon;
