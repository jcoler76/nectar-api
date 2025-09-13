import { Container, Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import authService from '../../services/authService';

const SetupAccount = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract token from URL query parameters
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, error

  // Determine if this is post-payment email verification based on the path
  const isEmailVerification = location.pathname === '/verify-email';

  // Use useCallback to prevent infinite re-renders in useEffect
  const verifyToken = useCallback(async () => {
    try {
      const response = await authService.verifyEmailToken(token);
      if (response.success) {
        setUserInfo(response.data);
        setVerificationStatus('success');
      } else {
        setVerificationStatus('error');
        setError(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      setVerificationStatus('error');
      setError(error.message || 'Unable to verify your email. Please try again later.');
    }
  }, [token]);

  useEffect(() => {
    // Only verify token for email verification flow
    if (isEmailVerification && token) {
      verifyToken();
    } else if (isEmailVerification && !token) {
      setVerificationStatus('error');
      setError('Invalid verification link. Please check your email for the correct link.');
    } else {
      // For regular setup-account flow, skip verification
      setVerificationStatus('success');
    }
  }, [token, isEmailVerification, verifyToken]); // Add verifyToken to dependencies

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isEmailVerification) {
        // Use the new setPassword endpoint that auto-logs in the user
        const response = await authService.setPassword(token, password);

        if (response.success) {
          // Auto-login was handled by setPassword, redirect to dashboard
          setSuccess('Welcome to NectarStudio.ai! Redirecting to your dashboard...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } else {
        // Use the traditional setup-account endpoint
        await authService.setupAccount(token, password);
        setSuccess('Your password has been set successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state for email verification
  if (isEmailVerification && verificationStatus === 'verifying') {
    return (
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            Verifying Email...
          </Typography>
          <Typography component="p" sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            Please wait while we verify your email address.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Show error state for failed verification
  if (isEmailVerification && verificationStatus === 'error') {
    return (
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" color="error">
            Verification Failed
          </Typography>
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          {isEmailVerification ? 'Welcome to NectarStudio.ai!' : 'Set Up Your Account'}
        </Typography>
        {isEmailVerification && userInfo ? (
          <Box sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            <Typography component="p" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              ✅ Email Verified!
            </Typography>
            <Typography component="p" sx={{ mt: 1 }}>
              Welcome, {userInfo.firstName}! Your subscription is active.
            </Typography>
            <Typography component="p" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {userInfo.email}
            </Typography>
          </Box>
        ) : (
          <Typography component="p" sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            Welcome! Please create a password to activate your account.
          </Typography>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading || !!success}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={loading || !!success}
          />
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
              {success}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!success}
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SetupAccount;
