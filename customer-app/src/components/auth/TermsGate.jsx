import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import TermsAndConditionsModal from './TermsAndConditionsModal';

/**
 * TermsGate component - Ensures users accept Terms and Conditions before accessing the app
 * This component wraps protected content and shows T&C modal if not accepted
 */
const TermsGate = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const response = await api.get('/api/terms/check-acceptance');

        if (response.data.success) {
          const { hasAccepted } = response.data.data;

          if (!hasAccepted) {
            // User hasn't accepted current terms, show modal
            setShowTermsModal(true);
          }
        }
      } catch (error) {
        // Check if error is specifically about terms not being accepted
        if (error.response?.data?.error === 'TERMS_NOT_ACCEPTED') {
          setShowTermsModal(true);
        } else {
          console.error('Error checking terms acceptance:', error);
        }
      } finally {
        setChecking(false);
      }
    };

    checkTermsAcceptance();
  }, [user]);

  const handleTermsAccept = async acceptanceData => {
    // Terms accepted successfully
    setShowTermsModal(false);

    // Optionally refresh the page or update user context
    // to ensure all components know terms have been accepted
    window.location.reload();
  };

  const handleTermsDecline = async () => {
    // User declined terms, log them out
    await logout();
    navigate('/login');
  };

  if (checking) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {children}
      <TermsAndConditionsModal
        open={showTermsModal}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    </>
  );
};

export default TermsGate;
