import React from 'react';
import { Bell, RefreshCw, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Navbar({ title, subtitle, actions }) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.body.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <header className="navbar">
      <div>
        <div className="navbar-title">{t('navbar.title')}</div>
        <div className="navbar-subtitle">{t('navbar.subtitle')}</div>
      </div>
      <div className="navbar-right">
        {actions}
        
        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <Languages size={14} color="var(--color-primary)" />
          <select 
            onChange={(e) => changeLanguage(e.target.value)}
            defaultValue={i18n.language}
            className="form-select"
            style={{ padding: '2px 8px', fontSize: 11, height: 28, width: 90, borderRadius: 6 }}
          >
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.location.reload()}
          title="Refresh"
        >
          <RefreshCw size={11} />
        </button>
        <button className="btn btn-secondary btn-sm" title="Notifications">
          <Bell size={11} />
        </button>
      </div>
    </header>
  );
}
