import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ThreeBackground from '../components/ThreeBackground';

export default function MainLayout() {
  return (
    <div className="app-shell">
      <ThreeBackground />
      <Sidebar />
      <div className="main-area" style={{ position: 'relative', zIndex: 1, background: 'transparent' }}>
        <Outlet />
      </div>
    </div>
  );
}
