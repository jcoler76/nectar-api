import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import CheckoutPage from './components/marketing/CheckoutPage';
import CheckoutSuccessPage from './components/marketing/CheckoutSuccessPage';
import ContactSalesPage from './components/marketing/ContactSalesPage';
import FreeSignupPage from './components/marketing/FreeSignupPage';
import HomePage from './components/marketing/HomePage';
import PricingPage from './components/marketing/PricingPage';
import SecurityPage from './components/marketing/SecurityPage';
import ChatWidget from './components/marketing/ChatWidget';

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

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      {/* Marketing chat widget on all marketing pages */}
      <ChatWidget />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/contact" element={<ContactSalesPage />} />
        <Route path="/free-signup" element={<FreeSignupPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        {/* Redirect all other routes to home */}
        <Route path="*" element={<HomePage />} />
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