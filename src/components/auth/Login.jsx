import { Eye, EyeOff, Loader2, Lock, Mail, Phone, Shield } from 'lucide-react';
import { useContext, useState } from 'react';

import AuthContext from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { FormActions, FormContainer, FormFieldGroup, FormSection } from '../ui/form-layout';
import { ValidationMessage } from '../ui/form-validation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const Login = () => {
  const {
    login,
    twoFactorRequired,
    setupTwoFactorRequired,
    verifyTwoFactor,
    requestTwoFactorCode,
    otpRequested,
    qrCode,
    secret,
  } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyTwoFactor(token, trustDevice);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid 2FA token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSetupForm = () => (
    <FormContainer>
      <form onSubmit={handleTokenSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Two-Factor Authentication Setup</h2>
          <p className="text-muted-foreground">
            Scan the QR code with your authenticator app to secure your account.
          </p>
        </div>

        {error && <ValidationMessage type="error">{error}</ValidationMessage>}

        <FormSection>
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-border inline-block">
              {qrCode ? (
                <img src={qrCode} alt="2FA QR Code" className="max-w-full h-auto" />
              ) : (
                <div className="flex items-center justify-center w-48 h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or manually enter this secret key:</p>
              <div className="bg-muted/30 p-3 rounded-lg border">
                <code className="text-sm font-mono font-semibold break-all">{secret}</code>
              </div>
            </div>
          </div>

          <FormFieldGroup>
            <Label htmlFor="token">Authentication Code *</Label>
            <Input
              id="token"
              name="token"
              type="text"
              required
              autoFocus
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              className="text-center text-lg tracking-widest"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </FormFieldGroup>
        </FormSection>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Try another way:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => requestTwoFactorCode('email')}
              aria-label="Send a login code via email"
            >
              <Mail className="h-4 w-4 mr-2" /> Email a code
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => requestTwoFactorCode('sms')}
              aria-label="Send a login code via SMS"
            >
              <Phone className="h-4 w-4 mr-2" /> SMS a code
            </Button>
          </div>
          {otpRequested && (
            <p className="text-xs text-green-600">
              A verification code has been sent. Check your inbox or messages.
            </p>
          )}
        </div>

        <FormActions align="center">
          <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Complete Login'
            )}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );

  const renderTokenForm = () => (
    <FormContainer>
      <form onSubmit={handleTokenSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Enter Authentication Code</h2>
          <p className="text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && <ValidationMessage type="error">{error}</ValidationMessage>}

        <FormSection>
          <FormFieldGroup>
            <Label htmlFor="token">Authentication Code *</Label>
            <Input
              id="token"
              name="token"
              type="text"
              required
              autoFocus
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              className="text-center text-lg tracking-widest"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </FormFieldGroup>

          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Try another way:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => requestTwoFactorCode('email')}
                aria-label="Send a login code via email"
              >
                <Mail className="h-4 w-4 mr-2" /> Email a code
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => requestTwoFactorCode('sms')}
                aria-label="Send a login code via SMS"
              >
                <Phone className="h-4 w-4 mr-2" /> SMS a code
              </Button>
            </div>
            {otpRequested && (
              <p className="text-xs text-green-600">
                A verification code has been sent. Check your inbox or messages.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox id="trust-device" checked={trustDevice} onCheckedChange={setTrustDevice} />
            <Label htmlFor="trust-device" className="text-sm text-muted-foreground cursor-pointer">
              Trust this device for 30 days (don&apos;t ask for 2FA on this device)
            </Label>
          </div>
        </FormSection>

        <FormActions align="center">
          <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );

  const renderLoginForm = () => (
    <FormContainer>
      <form onSubmit={handleLoginSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Nectar Studio</h2>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        {error && <ValidationMessage type="error">{error}</ValidationMessage>}

        <FormSection>
          <FormFieldGroup>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-8"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </FormFieldGroup>

          <FormFieldGroup>
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-8 pr-10"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-1.5 flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormFieldGroup>
        </FormSection>

        <FormActions align="center">
          <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4"
      style={{ minHeight: '100vh' }}
    >
      <main
        className="w-full max-w-md"
        role="main"
        aria-label="User authentication"
        style={{ maxWidth: '28rem' }}
      >
        <Card className="shadow-large">
          <CardContent className="p-0">
            {setupTwoFactorRequired
              ? renderSetupForm()
              : twoFactorRequired
                ? renderTokenForm()
                : renderLoginForm()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
