import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';

function Shell() {
  const { open, close } = useSidebar();
  return (
    <div className={`app-shell${open ? ' sidebar-open' : ''}`}>
      {open && <div className="sidebar-overlay" onClick={close} />}
      <Sidebar />
      <div className="main-area" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  );
}
