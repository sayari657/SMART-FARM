import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Farms from './pages/Farms';
import FarmDetails from './pages/FarmDetails';
import Animals from './pages/Animals';
import AnimalDetails from './pages/AnimalDetails';
import TelemetryAnalysis from './pages/TelemetryAnalysis';
import CVMonitoring from './pages/CVMonitoring';
import AlertsCenter from './pages/AlertsCenter';
import Recommendations from './pages/Recommendations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AboutBee from './pages/AboutBee';
import AboutCows from './pages/AboutCows';
import AboutPoultry from './pages/AboutPoultry';
import AboutSheep from './pages/AboutSheep';
import AboutGoats from './pages/AboutGoats';
import AboutRabbit from './pages/AboutRabbit';
import SovereignAssistant from './pages/SovereignAssistant';
import AboutProject from './pages/AboutProject';
import ArbresPlantations from './pages/ArbresPlantations';
import MapCenter from './pages/MapCenter';
import NotFound from './pages/NotFound';

// Worker Pages (PWA)
import WorkerLogin from './pages/WorkerLogin';
import WorkerLayout from './layouts/WorkerLayout';
import WorkerHome from './pages/worker/WorkerHome';
import WorkerTasks from './pages/worker/WorkerTasks';
import WorkerScan from './pages/worker/WorkerScan';
import WorkerReport from './pages/worker/WorkerReport';
import WorkerSettings from './pages/worker/WorkerSettings';
import WorkerInstructions from './pages/worker/WorkerInstructions';

function OwnerRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'worker') return <Navigate to="/worker" replace />;
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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="farms" element={<Farms />} />
        <Route path="farms/:id" element={<FarmDetails />} />
        <Route path="animals" element={<Animals />} />
        <Route path="animals/:id" element={<AnimalDetails />} />
        <Route path="telemetry" element={<TelemetryAnalysis />} />
        <Route path="cv" element={<CVMonitoring />} />
        <Route path="alerts" element={<AlertsCenter />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
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

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000, style: { fontSize: 13, fontWeight: 700, maxWidth: 420 } }}
      />
    </AuthProvider>
  );
}
