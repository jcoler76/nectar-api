import React from 'react';
import { Route } from 'react-router-dom';

import CheckoutPage from './components/marketing/CheckoutPage';
import CheckoutSuccessPage from './components/marketing/CheckoutSuccessPage';
import ContactSalesPage from './components/marketing/ContactSalesPage';
import FreeSignupPage from './components/marketing/FreeSignupPage';
import HomePage from './components/marketing/HomePage';
import PricingPage from './components/marketing/PricingPage';
import SecurityPage from './components/marketing/SecurityPage';
import TermsPage from './components/marketing/TermsPage';
import PrivacyPage from './components/marketing/PrivacyPage';

const MarketingRoutes = (
  <>
    <Route path="/home" element={<HomePage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/security" element={<SecurityPage />} />
    <Route path="/contact" element={<ContactSalesPage />} />
    <Route path="/free-signup" element={<FreeSignupPage />} />
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
  </>
);

export default MarketingRoutes;
