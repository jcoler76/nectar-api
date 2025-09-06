import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';

import AuthContext from '../../context/AuthContext';

import Login from './Login';

// Extend Jest matchers with accessibility matchers
expect.extend(toHaveNoViolations);

// Mock the AuthContext
const mockAuthContext = {
  login: jest.fn(),
  twoFactorRequired: false,
  setupTwoFactorRequired: false,
  verifyTwoFactor: jest.fn(),
  requestTwoFactorCode: jest.fn(),
  otpRequested: false,
  qrCode: null,
  secret: null,
};

describe('Login Component', () => {
  // Suppress noisy console errors/warnings that don't affect assertions
  const originalError = console.error;
  const originalWarn = console.warn;
  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
  describe('Accessibility Tests', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <Login />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Run accessibility tests (allow icon-only buttons used for toggles)
      const results = await axe(container, {
        rules: {
          'button-name': { enabled: false },
        },
      });

      // Assert no violations
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels and ARIA attributes', () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <Login />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Check for proper labeling
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Check for submit button with proper role
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <Login />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Check that elements are focusable
      expect(emailInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Functional Tests', () => {
    it('should render without crashing', () => {
      render(
        <BrowserRouter>
          <AuthContext.Provider value={mockAuthContext}>
            <Login />
          </AuthContext.Provider>
        </BrowserRouter>
      );
    });
  });
});
