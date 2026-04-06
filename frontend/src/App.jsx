import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';

// Pages
import Login           from './pages/Login';
import Register        from './pages/Register';
import Dashboard       from './pages/Dashboard';
import Farms           from './pages/Farms';
import FarmDetails     from './pages/FarmDetails';
import Animals         from './pages/Animals';
import AnimalDetails   from './pages/AnimalDetails';
import TelemetryAnalysis from './pages/TelemetryAnalysis';
import CVMonitoring    from './pages/CVMonitoring';
import AlertsCenter    from './pages/AlertsCenter';
import Recommendations from './pages/Recommendations';
import Reports         from './pages/Reports';
import Settings        from './pages/Settings';
import AboutBee        from './pages/AboutBee';
import AboutCows       from './pages/AboutCows';
import AboutPoultry    from './pages/AboutPoultry';
import AboutSheep      from './pages/AboutSheep';
import AboutGoats      from './pages/AboutGoats';
import AboutProject    from './pages/AboutProject';
import NotFound        from './pages/NotFound';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/about-project" replace />} />
        <Route path="dashboard"       element={<Dashboard />} />
        <Route path="farms"           element={<Farms />} />
        <Route path="farms/:id"       element={<FarmDetails />} />
        <Route path="animals"         element={<Animals />} />
        <Route path="animals/:id"     element={<AnimalDetails />} />
        <Route path="telemetry"       element={<TelemetryAnalysis />} />
        <Route path="cv"              element={<CVMonitoring />} />
        <Route path="alerts"          element={<AlertsCenter />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="reports"         element={<Reports />} />
        <Route path="settings"        element={<Settings />} />
        <Route path="aboutbee"        element={<AboutBee />} />
        <Route path="aboutcow"        element={<AboutCows />} />
        <Route path="aboutpoultry"    element={<AboutPoultry />} />
        <Route path="aboutsheep"      element={<AboutSheep />} />
        <Route path="aboutgoat"       element={<AboutGoats />} />
        <Route path="about-project"   element={<AboutProject />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
