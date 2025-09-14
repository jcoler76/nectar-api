import { Refresh as RefreshIcon, SmartToy as BotIcon } from '@mui/icons-material';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import React from 'react';

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <BotIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />

            <Typography variant="h5" gutterBottom>
              Business Intelligence Chat Error
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Something went wrong with the chat interface. Don&apos;t worry, your data is safe.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleRetry}>
                Retry Chat
              </Button>

              <Button variant="outlined" onClick={() => (window.location.href = '/dashboard')}>
                Go to Dashboard
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              If this problem persists, please contact your system administrator.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;
