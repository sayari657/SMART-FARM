import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import { usePinLock, PinLockScreen } from './components/PinLock';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import WorkerLayout from './layouts/WorkerLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import NoFarmGuard from './components/NoFarmGuard';

// Pages — lazy-loaded for code splitting
const Landing             = lazy(() => import('./pages/Landing'));
const Login               = lazy(() => import('./pages/Login'));
const Register            = lazy(() => import('./pages/Register'));
const Dashboard           = lazy(() => import('./pages/Dashboard'));
const Farms               = lazy(() => import('./pages/Farms'));
const FarmDetails         = lazy(() => import('./pages/FarmDetails'));
const Animals             = lazy(() => import('./pages/Animals'));
const AnimalDetails       = lazy(() => import('./pages/AnimalDetails'));
const TelemetryAnalysis   = lazy(() => import('./pages/TelemetryAnalysis'));
const CVMonitoring        = lazy(() => import('./pages/CVMonitoring'));
const AlertsCenter        = lazy(() => import('./pages/AlertsCenter'));
const Recommendations     = lazy(() => import('./pages/Recommendations'));
const Reports             = lazy(() => import('./pages/Reports'));
const Settings            = lazy(() => import('./pages/Settings'));
const AboutBee            = lazy(() => import('./pages/AboutBee'));
const AboutCows           = lazy(() => import('./pages/AboutCows'));
const AboutPoultry        = lazy(() => import('./pages/AboutPoultry'));
const AboutSheep          = lazy(() => import('./pages/AboutSheep'));
const AboutGoats          = lazy(() => import('./pages/AboutGoats'));
const AboutRabbit         = lazy(() => import('./pages/AboutRabbit'));
const SovereignAssistant  = lazy(() => import('./pages/SovereignAssistant'));
const AboutProject        = lazy(() => import('./pages/AboutProject'));
const ArbresPlantations   = lazy(() => import('./pages/ArbresPlantations'));
const MapCenter           = lazy(() => import('./pages/MapCenter'));
const Entrepot            = lazy(() => import('./pages/Entrepot'));
const NotFound            = lazy(() => import('./pages/NotFound'));
const WorkerLogin         = lazy(() => import('./pages/WorkerLogin'));
const WorkerHome          = lazy(() => import('./pages/worker/WorkerHome'));
const WorkerTasks         = lazy(() => import('./pages/worker/WorkerTasks'));
const WorkerScan          = lazy(() => import('./pages/worker/WorkerScan'));
const WorkerReport        = lazy(() => import('./pages/worker/WorkerReport'));
const WorkerSettings      = lazy(() => import('./pages/worker/WorkerSettings'));
const WorkerInstructions  = lazy(() => import('./pages/worker/WorkerInstructions'));
const IoTDevices          = lazy(() => import('./pages/IoTDevices'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const SuperAdminTenants   = lazy(() => import('./pages/superadmin/SuperAdminTenants'));
const SuperAdminUsers     = lazy(() => import('./pages/superadmin/SuperAdminUsers'));
const SuperAdminPlans     = lazy(() => import('./pages/superadmin/SuperAdminPlans'));
const SuperAdminFlags     = lazy(() => import('./pages/superadmin/SuperAdminFlags'));
const SuperAdminModels    = lazy(() => import('./pages/superadmin/SuperAdminModels'));
const SuperAdminAudit     = lazy(() => import('./pages/superadmin/SuperAdminAudit'));
const SuperAdminBroadcast = lazy(() => import('./pages/superadmin/SuperAdminBroadcast'));
const SuperAdminSystem    = lazy(() => import('./pages/superadmin/SuperAdminSystem'));
const SuperAdmin2FA       = lazy(() => import('./pages/superadmin/SuperAdmin2FA'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1117' }}>
    <div style={{ color: '#22c55e', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Chargement…</div>
  </div>
);

function SuperAdminRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return children;
}

function OwnerRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'worker') return <Navigate to="/worker" replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return children;
}

function WorkerRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/worker-login" replace />;
  if (user && user.role !== 'worker' && user.role !== 'owner') return <Navigate to="/worker-login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/worker-login" element={<WorkerLogin />} />
      <Route path="/register" element={<Register />} />

      {/* Protected layout — owner only */}
      <Route element={
        <OwnerRoute>
          <MainLayout />
        </OwnerRoute>
      }>
        {/* Farm-scoped pages — guarded: require at least one farm */}
        <Route path="/dashboard"    element={<NoFarmGuard><Dashboard /></NoFarmGuard>} />
        <Route path="farms"         element={<Farms />} />
        <Route path="farms/:id"     element={<NoFarmGuard><FarmDetails /></NoFarmGuard>} />
        <Route path="animals"       element={<NoFarmGuard><Animals /></NoFarmGuard>} />
        <Route path="animals/:id"   element={<NoFarmGuard><AnimalDetails /></NoFarmGuard>} />
        <Route path="telemetry"     element={<NoFarmGuard><TelemetryAnalysis /></NoFarmGuard>} />
        <Route path="cv"            element={<NoFarmGuard><CVMonitoring /></NoFarmGuard>} />
        <Route path="alerts"        element={<NoFarmGuard><AlertsCenter /></NoFarmGuard>} />
        <Route path="recommendations" element={<NoFarmGuard><Recommendations /></NoFarmGuard>} />
        <Route path="reports"       element={<NoFarmGuard><Reports /></NoFarmGuard>} />
        <Route path="settings"      element={<Settings />} />
        <Route path="aboutbee" element={<AboutBee />} />
        <Route path="aboutcow" element={<AboutCows />} />
        <Route path="aboutpoultry" element={<AboutPoultry />} />
        <Route path="poultry" element={<AboutPoultry />} />
        <Route path="aboutsheep" element={<AboutSheep />} />
        <Route path="aboutgoat" element={<AboutGoats />} />
        <Route path="aboutrabbit" element={<AboutRabbit />} />
        <Route path="assistant" element={<SovereignAssistant />} />
        <Route path="about-project" element={<AboutProject />} />
        <Route path="trees" element={<ArbresPlantations />} />
        <Route path="map" element={<MapCenter />} />
        <Route path="entrepot"    element={<Entrepot />} />
        <Route path="iot-devices" element={<NoFarmGuard><IoTDevices /></NoFarmGuard>} />
      </Route>

      {/* Worker Protected layout (PWA) */}
      <Route path="/worker" element={
        <WorkerRoute>
          <WorkerLayout />
        </WorkerRoute>
      }>
        <Route index element={<WorkerHome />} />
        <Route path="tasks" element={<WorkerTasks />} />
        <Route path="scan" element={<WorkerScan />} />
        <Route path="report" element={<WorkerReport />} />
        <Route path="settings" element={<WorkerSettings />} />
        <Route path="instructions" element={<WorkerInstructions />} />
      </Route>

      {/* SuperAdmin Portal — isolated layout */}
      <Route path="/superadmin" element={
        <SuperAdminRoute>
          <SuperAdminLayout />
        </SuperAdminRoute>
      }>
        <Route index              element={<SuperAdminDashboard />} />
        <Route path="tenants"   element={<SuperAdminTenants />} />
        <Route path="users"     element={<SuperAdminUsers />} />
        <Route path="plans"     element={<SuperAdminPlans />} />
        <Route path="flags"     element={<SuperAdminFlags />} />
        <Route path="models"    element={<SuperAdminModels />} />
        <Route path="audit"     element={<SuperAdminAudit />} />
        <Route path="broadcast" element={<SuperAdminBroadcast />} />
        <Route path="system"    element={<SuperAdminSystem />} />
        <Route path="2fa"       element={<SuperAdmin2FA />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppWithPin() {
  const { locked, unlock } = usePinLock();
  return (
    <>
      {locked && <PinLockScreen onUnlock={unlock} />}
      <OfflineBanner />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000, style: { fontSize: 13, fontWeight: 700, maxWidth: 'min(420px, calc(100vw - 32px))' } }}
      />
      <PWAInstallPrompt />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithPin />
      </AuthProvider>
    </ThemeProvider>
  );
}
