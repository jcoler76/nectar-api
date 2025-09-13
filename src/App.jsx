import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import ApplicationForm from './components/applications/ApplicationForm';
import ApplicationList from './components/applications/ApplicationList';
import AcceptInvitation from './components/auth/AcceptInvitation';
import Login from './components/auth/Login';
import SetupAccount from './components/auth/SetupAccount';
import TermsGate from './components/auth/TermsGate';
import LazyRoute from './components/common/LazyRoute';
import RateLimitErrorBoundary from './components/common/RateLimitErrorBoundary';
import EndpointList from './components/endpoints/EndpointList';
import ModernLayout from './components/layout/ModernLayout';
import ChatWidget from './components/marketing/ChatWidget';
import CreateRole from './components/roles/CreateRole';
import RoleEdit from './components/roles/RoleEdit';
import RoleList from './components/roles/RoleList';
import UserList from './components/users/UserList';
import { useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SelectionProvider } from './context/SelectionContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import WorkflowList from './features/workflows/WorkflowList';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import MarketingRoutes from './marketing/MarketingRoutes';
import './utils/cssOptimizer';
import './utils/performanceValidator';
import './utils/bundleSplitValidation';

// Lazier routes to reduce initial bundle size
const ApiDocViewer = lazy(() => import('./components/documentation/ApiDocViewer'));
const RateLimitAnalytics = lazy(() => import('./components/rateLimits/RateLimitAnalytics'));
const RateLimitForm = lazy(() => import('./components/rateLimits/RateLimitForm'));
const RateLimitList = lazy(() => import('./components/rateLimits/RateLimitList'));
const RateLimitMonitor = lazy(() => import('./components/rateLimits/RateLimitMonitor'));
const EndpointWizard = lazy(() => import('./components/services/EndpointWizard'));
const ServiceForm = lazy(() => import('./components/services/ServiceForm'));
// Phase 1: Lazy load top 5 routes for code splitting
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const WorkflowBuilder = lazy(() => import('./features/workflows/WorkflowBuilder'));
const ServiceList = lazy(() => import('./components/services/ServiceList'));
const ConnectionList = lazy(() => import('./components/connections/ConnectionList'));

// Reports components (grouped as one logical unit)
const ApiUsageReport = lazy(() => import('./components/reports/ApiUsageReport'));
const WorkflowExecutionReport = lazy(() => import('./components/reports/WorkflowExecutionReport'));
const ActivityLogsReport = lazy(() => import('./components/reports/ActivityLogsReport'));

// Lazy-load settings screens to reduce initial bundle size
const AdminSettings = lazy(() => import('./components/settings/AdminSettings'));
const UserSettings = lazy(() => import('./components/settings/UserSettings'));
const BillingPage = lazy(() => import('./components/settings/BillingPage'));
const TeamManagement = lazy(() => import('./components/settings/TeamManagement'));
const TermsManagement = lazy(() => import('./components/settings/TermsManagement'));

const ProtectedLayout = ({ children }) => {
  return (
    <TermsGate>
      <ModernLayout>{children}</ModernLayout>
    </TermsGate>
  );
};

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !user[requiredPermission]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};

function App() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const location = useLocation();

  // Enable session timeout management
  useSessionTimeout();

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <BreadcrumbProvider>
        <SelectionProvider>
          <NotificationProvider>
            {/* Marketing chat widget on public marketing pages */}
            {[
              '/home',
              '/pricing',
              '/free-signup',
              '/checkout',
              '/checkout/success',
              '/contact',
            ].some(p => location.pathname.startsWith(p)) && <ChatWidget />}
            <Routes>
              {/* Marketing Site Routes - Public */}
              {MarketingRoutes}

              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/home" replace />
                  )
                }
              />

              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
              />

              <Route path="/setup-account" element={<SetupAccount />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={Dashboard} routeName="Dashboard" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/connections"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ConnectionList} routeName="Connections" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ServiceList} routeName="Services" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services/wizard"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={EndpointWizard} routeName="Endpoint Wizard" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services/new"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ServiceForm} routeName="New Service" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services/edit/:id"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ServiceForm} routeName="Edit Service" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UserList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute>
                    <RoleList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles/create"
                element={
                  <ProtectedRoute>
                    <CreateRole mode="create" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles/edit/:id"
                element={
                  <ProtectedRoute>
                    <RoleEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute>
                    <ApplicationList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications/new"
                element={
                  <ProtectedRoute>
                    <ApplicationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications/edit/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflows"
                element={
                  <ProtectedRoute>
                    <WorkflowList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflows/edit/:id"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={WorkflowBuilder} routeName="Workflow Builder" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentation"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ApiDocViewer} routeName="API Documentation" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/api-usage"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ApiUsageReport} routeName="API Usage Report" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/workflow-executions"
                element={
                  <ProtectedRoute>
                    <LazyRoute
                      component={WorkflowExecutionReport}
                      routeName="Workflow Execution Report"
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/activity-logs"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={ActivityLogsReport} routeName="Activity Logs Report" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/endpoints"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <EndpointList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-settings"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={UserSettings} routeName="User Settings" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={BillingPage} routeName="Billing" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:organizationId"
                element={
                  <ProtectedRoute>
                    <LazyRoute component={TeamManagement} routeName="Team Management" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-settings"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <LazyRoute component={AdminSettings} routeName="Admin Settings" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/terms"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <LazyRoute component={TermsManagement} routeName="Terms Management" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-limits"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <RateLimitErrorBoundary>
                      <Suspense fallback={<div>Loading rate limits...</div>}>
                        <RateLimitList />
                      </Suspense>
                    </RateLimitErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-limits/monitor"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <RateLimitErrorBoundary>
                      <Suspense fallback={<div>Loading rate limit monitor...</div>}>
                        <RateLimitMonitor />
                      </Suspense>
                    </RateLimitErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-limits/analytics"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <RateLimitErrorBoundary>
                      <Suspense fallback={<div>Loading rate limit analytics...</div>}>
                        <RateLimitAnalytics />
                      </Suspense>
                    </RateLimitErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-limits/create"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <RateLimitErrorBoundary>
                      <Suspense fallback={<div>Loading rate limit form...</div>}>
                        <RateLimitForm />
                      </Suspense>
                    </RateLimitErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rate-limits/:id/edit"
                element={
                  <ProtectedRoute requiredPermission="isAdmin">
                    <RateLimitErrorBoundary>
                      <Suspense fallback={<div>Loading rate limit form...</div>}>
                        <RateLimitForm />
                      </Suspense>
                    </RateLimitErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </SelectionProvider>
      </BreadcrumbProvider>
    </LocalizationProvider>
  );
}

export default App;
