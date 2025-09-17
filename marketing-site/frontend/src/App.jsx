import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import APIPage from './components/marketing/APIPage';
import CheckoutPage from './components/marketing/CheckoutPage';
import CheckoutSuccessPage from './components/marketing/CheckoutSuccessPage';
import ContactSalesPage from './components/marketing/ContactSalesPage';
import FeaturesPage from './components/marketing/FeaturesPage';
import FreeSignupPage from './components/marketing/FreeSignupPage';
import HomePage from './components/marketing/HomePage';
import IntegrationsPage from './components/marketing/IntegrationsPage';
import PricingPage from './components/marketing/PricingPage';
import SecurityPage from './components/marketing/SecurityPage';
import TermsPage from './components/marketing/TermsPage';
import PrivacyPage from './components/marketing/PrivacyPage';
import MarketingLayout from './components/marketing/MarketingLayout';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Component to handle scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/api" element={<APIPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<ContactSalesPage />} />
          <Route path="/free-signup" element={<FreeSignupPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          {/* Redirect all other routes to home */}
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
