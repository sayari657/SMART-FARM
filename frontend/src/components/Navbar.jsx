import React from 'react';
import { Bell, RefreshCw } from 'lucide-react';

export default function Navbar({ title, subtitle, actions }) {
  return (
    <header className="navbar">
      <div>
        <div className="navbar-title">{title}</div>
        {subtitle && <div className="navbar-subtitle">{subtitle}</div>}
      </div>
      <div className="navbar-right">
        {actions}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.location.reload()}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
        <button className="btn btn-secondary btn-sm" title="Notifications">
          <Bell size={13} />
        </button>
      </div>
    </header>
  );
}
