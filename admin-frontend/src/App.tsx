import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { LazyMotion, domAnimation } from 'framer-motion';

import ModelHub from './pages/command-center/ModelHub';
import DatabaseControl from './pages/command-center/DatabaseControl';
import Telemetry from './pages/command-center/Telemetry';
import RBACStudio from './pages/command-center/RBACStudio';
import NetworkSecurity from './pages/command-center/NetworkSecurity';
import Analytics from './pages/command-center/Analytics';
import PromptFirewall from './pages/command-center/PromptFirewall';
import AutoHealing from './pages/command-center/AutoHealing';
import GlobalBroadcast from './pages/command-center/GlobalBroadcast';
import PlatformBranding from './pages/command-center/PlatformBranding';
import DeveloperKeys from './pages/command-center/DeveloperKeys';
import DefconControls from './pages/command-center/DefconControls';
import WorkflowOrchestrator from './pages/command-center/WorkflowOrchestrator';
import TopologyMap from './pages/command-center/TopologyMap';
import TenantManager from './pages/command-center/TenantManager';
import ChaosMonkey from './pages/command-center/ChaosMonkey';
import KnowledgeGraph from './pages/command-center/KnowledgeGraph';
import ClusterFederation from './pages/command-center/ClusterFederation';
import PredictiveScaling from './pages/command-center/PredictiveScaling';
import HardwareGPU from './pages/command-center/HardwareGPU';
import PlatformOutage from './pages/command-center/PlatformOutage';
import ReleaseManagement from './pages/command-center/ReleaseManagement';

// New Subscription/Usage pages
import SubscriptionPlans from './pages/command-center/SubscriptionPlans';
import UsageMonitoring from './pages/command-center/UsageMonitoring';
import UserPlanManager from './pages/command-center/UserPlanManager';

// Protected route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return token ? <>{children}</> : <Navigate to="/login" />;
}

// Define all routes using createBrowserRouter (RRv7 API)
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/dashboard", element: <AdminRoute><Dashboard /></AdminRoute> },
  { path: "/models", element: <AdminRoute><ModelHub /></AdminRoute> },
  { path: "/database", element: <AdminRoute><DatabaseControl /></AdminRoute> },
  { path: "/telemetry", element: <AdminRoute><Telemetry /></AdminRoute> },
  { path: "/rbac", element: <AdminRoute><RBACStudio /></AdminRoute> },
  { path: "/network", element: <AdminRoute><NetworkSecurity /></AdminRoute> },
  { path: "/analytics", element: <AdminRoute><Analytics /></AdminRoute> },
  { path: "/firewall", element: <AdminRoute><PromptFirewall /></AdminRoute> },
  { path: "/diagnostics", element: <AdminRoute><AutoHealing /></AdminRoute> },
  { path: "/broadcast", element: <AdminRoute><GlobalBroadcast /></AdminRoute> },
  { path: "/branding", element: <AdminRoute><PlatformBranding /></AdminRoute> },
  { path: "/apikeys", element: <AdminRoute><DeveloperKeys /></AdminRoute> },
  { path: "/defcon", element: <AdminRoute><DefconControls /></AdminRoute> },
  { path: "/workflows", element: <AdminRoute><WorkflowOrchestrator /></AdminRoute> },
  { path: "/topology", element: <AdminRoute><TopologyMap /></AdminRoute> },
  { path: "/tenants", element: <AdminRoute><TenantManager /></AdminRoute> },
  { path: "/chaos", element: <AdminRoute><ChaosMonkey /></AdminRoute> },
  { path: "/knowledge", element: <AdminRoute><KnowledgeGraph /></AdminRoute> },
  { path: "/federation", element: <AdminRoute><ClusterFederation /></AdminRoute> },
  { path: "/predictive", element: <AdminRoute><PredictiveScaling /></AdminRoute> },
  { path: "/hardware", element: <AdminRoute><HardwareGPU /></AdminRoute> },
  { path: "/maintenance", element: <AdminRoute><PlatformOutage /></AdminRoute> },
  { path: "/releases", element: <AdminRoute><ReleaseManagement /></AdminRoute> },
  // New Subscription/Usage routes
  { path: "/subscriptions", element: <AdminRoute><SubscriptionPlans /></AdminRoute> },
  { path: "/usage", element: <AdminRoute><UsageMonitoring /></AdminRoute> },
  { path: "/user-plans", element: <AdminRoute><UserPlanManager /></AdminRoute> },
  // Catch-all
  { path: "*", element: <Navigate to="/dashboard" /> },
]);

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LazyMotion>
  );
}

export default App;
