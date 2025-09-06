import {
  TextField,
  Typography,
  Box,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// --- Helper Functions ---

const cronToState = cronString => {
  if (!cronString) return { type: 'daily', time: '09:00' };

  const parts = cronString.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every X minutes: */X * * * *
  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const intervalMinutes = minute.substring(2);
    return { type: 'minutes', interval: intervalMinutes };
  }
  // Hourly: 0 * * * *
  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return { type: 'hourly' };
  }
  // Simple Daily: 30 9 * * * (specific minute and hour, but not wildcards for both)
  if (
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*' &&
    minute !== '*' &&
    hour !== '*' &&
    !minute.startsWith('*/')
  ) {
    return { type: 'daily', time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` };
  }
  // Simple Weekly: 30 9 * * 1 (specific minute, hour, and day of week)
  if (
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek !== '*' &&
    minute !== '*' &&
    hour !== '*' &&
    !minute.startsWith('*/')
  ) {
    return {
      type: 'weekly',
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      day: dayOfWeek,
    };
  }
  // Simple Monthly: 30 9 15 * * (specific minute, hour, and day of month)
  if (
    month === '*' &&
    dayOfWeek === '*' &&
    dayOfMonth !== '*' &&
    minute !== '*' &&
    hour !== '*' &&
    !minute.startsWith('*/')
  ) {
    return {
      type: 'monthly',
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      day: dayOfMonth,
    };
  }

  return { type: 'custom', pattern: cronString };
};

const stateToCron = state => {
  const [hour, minute] = state.time ? state.time.split(':') : ['0', '0'];

  switch (state.type) {
    case 'minutes':
      return `*/${state.interval} * * * *`;
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${state.day}`;
    case 'monthly':
      return `${minute} ${hour} ${state.day} * *`;
    case 'hourly':
      return `0 * * * *`;
    case 'custom':
      return state.pattern;
    default:
      return '';
  }
};

const SchedulerTriggerPanel = ({ node, onNodeDataChange }) => {
  const [scheduleState, setScheduleState] = useState({ type: 'daily', time: '09:00' });
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    if (node && node.data) {
      setScheduleState(cronToState(node.data.pattern));
      setTimezone(node.data.timezone || 'America/New_York');
    }
  }, [node]);

  if (!node || !node.data) {
    return null;
  }

  const handleStateChange = newPartialState => {
    const isNewType = 'type' in newPartialState;

    const getFreshState = type => {
      switch (type) {
        case 'minutes':
          return { type: 'minutes', interval: '5' };
        case 'hourly':
          return { type: 'hourly' };
        case 'daily':
          return { type: 'daily', time: '09:00' };
        case 'weekly':
          return { type: 'weekly', time: '09:00', day: '1' };
        case 'monthly':
          return { type: 'monthly', time: '09:00', day: '1' };
        case 'custom':
          return { type: 'custom', pattern: '0 9 * * *' };
        default:
          return { type: 'daily', time: '09:00' };
      }
    };

    const updatedState = isNewType
      ? getFreshState(newPartialState.type)
      : { ...scheduleState, ...newPartialState };

    setScheduleState(updatedState);
    const newCron = stateToCron(updatedState);
    if (node && onNodeDataChange) {
      onNodeDataChange({ ...node.data, pattern: newCron, timezone });
    }
  };

  const handleTimezoneChange = newTimezone => {
    setTimezone(newTimezone);
    if (node && onNodeDataChange) {
      const newCron = stateToCron(scheduleState);
      onNodeDataChange({ ...node.data, pattern: newCron, timezone: newTimezone });
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Scheduler Settings</Typography>

      <FormControl fullWidth>
        <InputLabel>Frequency</InputLabel>
        <Select
          value={scheduleState.type || 'daily'}
          label="Frequency"
          onChange={e => handleStateChange({ type: e.target.value })}
        >
          <MenuItem value="minutes">Every X Minutes</MenuItem>
          <MenuItem value="hourly">Every Hour</MenuItem>
          <MenuItem value="daily">Every Day</MenuItem>
          <MenuItem value="weekly">Every Week</MenuItem>
          <MenuItem value="monthly">Every Month</MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Timezone</InputLabel>
        <Select
          value={timezone}
          label="Timezone"
          onChange={e => handleTimezoneChange(e.target.value)}
        >
          <MenuItem value="America/New_York">Eastern Time (America/New_York)</MenuItem>
          <MenuItem value="America/Chicago">Central Time (America/Chicago)</MenuItem>
          <MenuItem value="America/Denver">Mountain Time (America/Denver)</MenuItem>
          <MenuItem value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</MenuItem>
          <MenuItem value="UTC">UTC</MenuItem>
        </Select>
      </FormControl>

      {scheduleState.type === 'minutes' && (
        <TextField
          label="Interval (Minutes)"
          type="number"
          value={scheduleState.interval || '5'}
          onChange={e => handleStateChange({ interval: e.target.value })}
          inputProps={{ min: 1, max: 1440 }}
          fullWidth
          helperText="Set the interval in minutes (1-1440). For example, 5 means every 5 minutes."
        />
      )}

      {['daily', 'weekly', 'monthly'].includes(scheduleState.type) && (
        <TextField
          label="Time"
          type="time"
          value={scheduleState.time || '09:00'}
          onChange={e => handleStateChange({ time: e.target.value })}
          fullWidth
        />
      )}

      {scheduleState.type === 'weekly' && (
        <FormControl fullWidth>
          <Typography variant="caption" sx={{ mb: 1 }}>
            Day of the Week
          </Typography>
          <ToggleButtonGroup
            value={scheduleState.day || '1'}
            exclusive
            onChange={(_, newDay) => newDay && handleStateChange({ day: newDay })}
            fullWidth
          >
            <ToggleButton value="1">Mon</ToggleButton>
            <ToggleButton value="2">Tue</ToggleButton>
            <ToggleButton value="3">Wed</ToggleButton>
            <ToggleButton value="4">Thu</ToggleButton>
            <ToggleButton value="5">Fri</ToggleButton>
            <ToggleButton value="6">Sat</ToggleButton>
            <ToggleButton value="0">Sun</ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
      )}

      {scheduleState.type === 'monthly' && (
        <TextField
          label="Day of Month"
          type="number"
          value={scheduleState.day || '1'}
          onChange={e => handleStateChange({ day: e.target.value })}
          inputProps={{ min: 1, max: 31 }}
          fullWidth
        />
      )}

      {scheduleState.type === 'custom' && (
        <TextField
          label="Cron Pattern"
          variant="outlined"
          fullWidth
          value={scheduleState.pattern || ''}
          onChange={e => handleStateChange({ pattern: e.target.value })}
          helperText={
            <span>
              Need help? Check out{' '}
              <Link href="https://crontab.guru/" target="_blank" rel="noopener">
                crontab.guru
              </Link>
              .
            </span>
          }
        />
      )}
    </Box>
  );
};

export default SchedulerTriggerPanel;
