import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../../services/api';

const TermsAndConditionsModal = ({ open, onAccept, onDecline }) => {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const contentRef = useRef(null);

  // Fetch current terms and conditions
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/terms/current');
        if (response.data.success) {
          setTerms(response.data.data);
        } else {
          setError('Failed to load Terms and Conditions');
        }
      } catch (err) {
        console.error('Error fetching terms:', err);
        setError('Failed to load Terms and Conditions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchTerms();
    }
  }, [open]);

  // Track scroll position to enable acceptance button
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;

      // If content doesn't overflow (no scrolling needed), consider it read
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
        return;
      }

      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Consider scrolled to bottom if within 50px of bottom or 90% of content
      const pixelsFromBottom = scrollHeight - (scrollTop + clientHeight);
      if (scrollPercentage >= 0.9 || pixelsFromBottom <= 50) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  // Check scroll on initial load in case content doesn't require scrolling
  useEffect(() => {
    if (terms && contentRef.current) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        handleScroll();
      }, 100);
    }
  }, [terms, handleScroll]);

  // Handle terms acceptance
  const handleAccept = async () => {
    if (!agreedToTerms || !hasScrolledToBottom) {
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const response = await api.post('/api/terms/accept', {
        acceptanceMethod: hasScrolledToBottom ? 'SCROLL' : 'CLICK',
      });

      if (response.data.success) {
        // Call the onAccept callback with acceptance data
        onAccept({
          acceptanceId: response.data.data.acceptanceId,
          acceptedAt: response.data.data.acceptedAt,
          termsVersion: response.data.data.termsVersion,
        });
      } else {
        setError('Failed to record acceptance. Please try again.');
      }
    } catch (err) {
      console.error('Error accepting terms:', err);
      setError('Failed to accept Terms and Conditions. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // Handle decline (logout)
  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasScrolledToBottom(false);
      setAgreedToTerms(false);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      onClose={(event, reason) => {
        // Prevent closing the dialog by clicking outside or pressing escape
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
      }}
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Terms and Conditions
        </Typography>
        {terms && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Version {terms.version}
            {terms.effectiveDate &&
              (() => {
                try {
                  // Handle both string and object effectiveDate
                  let dateValue = terms.effectiveDate;
                  if (typeof dateValue === 'object' && Object.keys(dateValue).length === 0) {
                    // Empty object, skip date display
                    return '';
                  }

                  const effectiveDate = new Date(dateValue);
                  if (!isNaN(effectiveDate.getTime())) {
                    return ` - Effective ${format(effectiveDate, 'MMMM d, yyyy')}`;
                  }
                } catch (error) {
                  console.warn('Invalid effective date:', terms.effectiveDate, error);
                }
                return '';
              })()}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && terms && (
          <>
            {terms.summary && (
              <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary of Changes:
                </Typography>
                <Typography variant="body2">{terms.summary}</Typography>
              </Paper>
            )}

            <Box
              ref={contentRef}
              onScroll={handleScroll}
              sx={{
                maxHeight: '50vh',
                overflowY: 'auto',
                pr: 2,
                '& h1, & h2, & h3': {
                  mt: 3,
                  mb: 1,
                },
                '& p': {
                  mb: 2,
                },
                '& ul, & ol': {
                  mb: 2,
                  pl: 3,
                },
              }}
            >
              <DialogContentText
                component="div"
                dangerouslySetInnerHTML={{ __html: terms.content }}
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.7,
                  '& *': {
                    fontFamily: 'inherit',
                  },
                }}
              />
            </Box>

            {!hasScrolledToBottom && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please scroll down to read the entire Terms and Conditions before accepting. Once
                you reach the end, you'll be able to check the agreement box below.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  disabled={!hasScrolledToBottom || accepting}
                />
              }
              label={
                <Typography variant="body1">
                  I have read, understood, and agree to be bound by these Terms and Conditions
                </Typography>
              }
              sx={{ mt: 2 }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleDecline} color="inherit" disabled={accepting}>
          Decline and Logout
        </Button>
        <Button
          onClick={handleAccept}
          variant="contained"
          color="primary"
          disabled={!agreedToTerms || !hasScrolledToBottom || accepting || loading}
          startIcon={accepting && <CircularProgress size={20} />}
        >
          {accepting ? 'Accepting...' : 'Accept and Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsAndConditionsModal;
